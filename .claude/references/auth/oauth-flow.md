---
title: OAuth Flow (genericOAuth, lazy id_token verification, OIDC endsession)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/lib/env.ts, src/app/signin/page.tsx, src/app/api/auth/[...all]/route.ts, src/components/user-menu/actions.ts, src/components/user-menu/user-menu.tsx]
symbols: [auth, ministryPlatformProviderConfig, lazyIdTokenVerifier, sharedInstance, getOidcClient, handleSignOut]
related: [sessions.md, user-identity.md, route-protection.md, ../security/README.md]
last_verified: 2026-09-30
---

## Purpose
End-to-end OAuth2/OIDC flow against Ministry Platform: sign-in, token exchange,
id_token verification, profile mapping, and RP-initiated logout via `endsession`.

## Files
- `src/lib/auth.ts` — provider config (`ministryPlatformProviderConfig`, `providerId: "ministryplatform"`), `lazyIdTokenVerifier`, `sharedInstance`
- `src/lib/env.ts` — `getMpBaseUrl()`, `getAuthBaseUrl()`, `getOidcClient()` (validated env readers)
- `src/app/signin/sign-in-content.tsx` — calls `authClient.signIn.social({ provider: "ministryplatform", callbackURL })`
- `src/app/api/auth/[...all]/route.ts` — deny-by-default allowlist in front of `toNextJsHandler(auth)`
- `src/components/user-menu/actions.ts` — `handleSignOut()` server action
- Tests: `src/auth.oidc-discovery.test.ts` (outages, lazy discovery), `src/auth.user-info.test.ts` (`getUserInfo` with signed tokens), `src/auth.id-token-sign-in.test.ts` (F12), `src/auth.shared-instance.test.ts`, `src/auth.test.ts` (config pins), `src/components/user-menu/actions.test.ts`; mock MP in `src/test-utils/mock-oidc.ts`

## Key concepts
- **No boot-time discovery (security Step 4, upstream MPNext issue #101).** The provider has explicit `authorizationUrl`, `tokenUrl` and `endSessionEndpoint` and **no `discoveryUrl`**, so building the auth instance — `next build`, cold starts, every page's session check — makes **no MP call** and the provider always registers. With `discoveryUrl`, better-auth 1.7 fetched discovery once at boot with no timeout or retry: one MP blip left `/sign-in/social` answering `404 PROVIDER_NOT_FOUND` until a restart, and a hung MP stalled every request ~300 s.
- **The id_token is still verified — by the app.** `getUserInfo` calls `verifyMpIdToken`: RS256 only (`ID_TOKEN_ALGORITHMS`, pinned), signature against MP's JWKS, `iss` = the discovered issuer, `aud` = the OIDC client id, `exp`/`nbf` when present. The issuer and `jwks_uri` come from MP's discovery document, loaded **lazily at the first callback** by `lazyIdTokenVerifier`: 5 s timeout (`OIDC_DISCOVERY_TIMEOUT_MS`), `redirect: "error"`, single-flight, cached on success, **never cached on failure**, fails closed on a document missing `issuer`/`jwks_uri`. The JWKS URL is **not** pinned (MP serves `/oauth/.well-known/jwks`, not the IdentityServer default).
- **`getUserInfo` order** (every refusal returns `null`, never throws — better-auth's callback does not catch): missing id_token → verify → `sub` present → `exp` present / `azp` = us when `aud` is a list → userinfo fetch (10 s `USERINFO_TIMEOUT_MS`, `redirect: "error"`) → `extractUserGuid` → **userinfo `sub` must equal the id_token `sub`** (case-insensitive). The binding is F12's defence-in-depth layer. Returns `{ sub, email: <sub>@mp.invalid, mpEmail, name, image: undefined, emailVerified: <claim> }`.
- **Dedicated OIDC client (owner decision).** Sign-in runs as `MP_OIDC_CLIENT_ID` / `MP_OIDC_CLIENT_SECRET`, not the service account (`MINISTRY_PLATFORM_CLIENT_ID`). Unset, `getOidcClient()` falls back to the service account and `auth.ts` logs `auth.oidc.shared_client` once per process; half a pair refuses to start. The fallback is slated for removal (`.claude/TODO/2026-09-30-require-dedicated-oidc-client.md`).
- **PKCE is DISABLED** (`pkce: false`) — permanent. MP advertises `code_challenge_methods_supported: ["plain", "S256"]` but rejects the exchange with `invalid_grant` (verified 2026-09-13). **No nonce either**: with no id_token config better-auth neither sends nor requires one (`requiresIdTokenNonce: false`). `requireIdTokenVerification` and `disableIdTokenNonceBinding` are gone (the first throws without discovery; the second is a no-op). Accepted risk F8 — see `../security/README.md`.
- MP requires a **`realm=realm`** authorization URL param (`authorizationUrlParams`).
- **`accountSubject`** is `({ profile }) => typeof profile.sub === "string" ? profile.sub : ""`. Required: without discovery the provider is not recognised as OIDC and the default resolver would read `profile.id` (never returned), keying every account on `""`.
- **`mapProfileToUser`** persists `sub` as `userGuid` and sets `email` to the synthetic `<sub>@mp.invalid`; the real address is `mpEmail`. See `user-identity.md`.
- **Callback URL:** `${APP_URL}/api/auth/callback/ministryplatform` (core `/callback/{providerId}` since better-auth 1.7). `providerId` must stay `"ministryplatform"` — it is the registered redirect URI and the stable half of every account key.
- **One auth instance per process** (`sharedInstance`, `Symbol.for("mpnext-tools.auth")`). Next loads `auth.ts` once per bundle layer; without the cache the sign-out server action ran against a different in-memory store than the callback, so it found no id_token and could not delete the session row.

## Sign-in flow

```
1. Browser hits protected path → src/proxy.ts → 302 /signin?callbackUrl=<original>
2. /signin → authClient.signIn.social({ provider: "ministryplatform", callbackURL })
   (POST /api/auth/sign-in/social — no MP call; the authorize URL is built locally)
3. Browser → MP /oauth/connect/authorize?client_id=<MP_OIDC_CLIENT_ID>&realm=realm&...
4. MP → ${APP_URL}/api/auth/callback/ministryplatform?code=...&state=...
5. better-auth: state cookie check → token exchange (client secret) → getUserInfo(tokens):
   a. first callback on this process: fetch discovery (issuer, jwks_uri), then JWKS
   b. verify id_token; sub / exp / azp checks
   c. userinfo; sub binding
   → accountSubject → mapProfileToUser → user + account rows (access/refresh tokens
     nulled by databaseHooks; idToken kept in memory only) → session cookies
6. Browser lands on callbackURL
```

## Failure modes and log events (identifiers only)

| Event | Meaning |
|---|---|
| `auth.oidc.discovery_failed` | Discovery unavailable at a callback. `reason`: `http_status`+`status`, `request_failed`+`errName`, `invalid_json`+`errName`, `invalid_document`+`field` (`body`/`issuer`/`jwks_uri`). Retried on the next sign-in |
| `auth.userinfo.id_token_unverified` | `reason: "verifier_unavailable"` (discovery failed) or `"verification_failed"` + jose `code` (e.g. `ERR_JWT_EXPIRED`, `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`, `ERR_JOSE_ALG_NOT_ALLOWED`, `ERR_JWKS_TIMEOUT`) / `claim` / `errName` |
| `auth.userinfo.id_token_claims_invalid` | `missing_exp` or `azp_mismatch` |
| `auth.userinfo.sub_mismatch` | `missing_id_token`, `missing_sub`, or `mismatch` (token substitution) |
| `auth.userinfo.fetch_failed` | userinfo `http_status`, `request_failed`, `invalid_json`, `not_an_object` |
| `auth.userinfo.invalid_sub` | userinfo `sub` missing or not a GUID |
| `auth.oidc.shared_client` (warn) | sign-in is using the service-account client (`source`: `fallback` / `same_as_service_account`) |

**What an MP outage looks like now:** `/signin` always starts. A callback during
the outage lands on `/auth-error?error=unable_to_get_user_info` (retry copy),
and the next sign-in recovers on the same process. `PROVIDER_NOT_FOUND` /
`oauth_provider_not_found` now means misconfiguration only.

## Sign-out flow (`src/components/user-menu/actions.ts`)

1. `auth.api.signOut({ headers, body: { disableRedirect: true } })` — clears the
   app session **first**, so a broken env below still signs the user out, and
   returns better-auth's provider logout URL.
2. The `id_token_hint` is taken from that URL **only if its origin is the MP
   origin**.
3. The end-session URL is rebuilt:
   `${MP}/oauth/connect/endsession?post_logout_redirect_uri=<BETTER_AUTH_URL>&client_id=<OIDC client>[&id_token_hint=…]`
   — `post_logout_redirect_uri` exactly as registered (better-auth would add a
   trailing `/` and drop `client_id` when it has a hint).
4. `redirect()` — a `NEXT_REDIRECT` throw. `user-menu.tsx` wraps the call in
   try/catch with `unstable_rethrow(err)` **first**, then alerts on a genuine
   failure (it used to fail silently).

**Limitation:** the id_token lives only in the in-memory account row of the
process that handled the callback. A sign-out on another serverless instance
(or after a restart) has no hint; MP then relies on `client_id` +
`post_logout_redirect_uri` and may show its "log out?" prompt once. The app
session is cleared either way.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MINISTRY_PLATFORM_BASE_URL` | yes | Root of the OIDC endpoints (authorize, token, userinfo, endsession, lazy discovery). Validated by `getMpBaseUrl()` |
| `MP_OIDC_CLIENT_ID` / `MP_OIDC_CLIENT_SECRET` | recommended (both or neither) | Dedicated sign-in client: OAuth client, id_token audience, sign-out `client_id` |
| `MINISTRY_PLATFORM_CLIENT_ID` / `_SECRET` | yes | Service account for MP data; deprecated sign-in fallback |
| `BETTER_AUTH_URL` | yes (fallback `NEXTAUTH_URL`) | App origin: callbacks + `post_logout_redirect_uri`. Validated by `getAuthBaseUrl()` |
| `BETTER_AUTH_SECRET` | yes (fallback `NEXTAUTH_SECRET`) | Session signing/encryption secret |

## MP OAuth client setup (the dedicated sign-in client)
- **Redirect URI:** `${APP_URL}/api/auth/callback/ministryplatform`
- **Post-logout redirect URI:** exactly `BETTER_AUTH_URL` (no trailing slash)

## Gotchas
- Re-adding `discoveryUrl` brings back the boot-time outage **and** re-opens `/sign-in/social`'s id_token mode (F12); `src/auth.oidc-discovery.test.ts` and `src/auth.test.ts` go red.
- `user.id` ≠ `userGuid`; `session.user.email` is synthetic — read `mpEmail`.
- Under `next dev`, auth option edits need a server restart (the instance is cached on `globalThis`).

## Related docs
- `sessions.md` — cookies, lifetime, what sign-out can and cannot revoke
- `user-identity.md` — `sub` → `userGuid` mapping and consumer patterns
- `route-protection.md` — `callbackUrl` preservation through the OAuth round-trip

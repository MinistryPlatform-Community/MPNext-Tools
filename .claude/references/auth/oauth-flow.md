---
title: OAuth Flow (genericOAuth + OIDC endsession)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/app/signin/page.tsx, src/app/api/auth/[...all]/route.ts, src/components/user-menu/actions.ts]
symbols: [auth, handleSignOut]
related: [sessions.md, user-identity.md, route-protection.md]
last_verified: 2026-04-17
---

## Purpose
End-to-end OAuth2/OIDC flow against Ministry Platform: sign-in, token exchange, profile mapping, and OIDC-style logout via `endsession`.

## Files
- `src/lib/auth.ts` — `genericOAuth` provider config, exported as `ministryPlatformProviderConfig` (`providerId: "ministryplatform"`)
- `src/app/signin/page.tsx` — client page that calls `authClient.signIn.oauth2(...)`
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler via `toNextJsHandler(auth)`
- `src/components/user-menu/actions.ts` — `handleSignOut()` server action for OIDC logout
- `src/auth.test.ts` — unit tests for `getUserInfo`, `mapProfileToUser`
- `src/components/user-menu/actions.test.ts` — tests for `handleSignOut`

## Key concepts
- Provider is registered under **`providerId: "ministryplatform"`** (exported as `ministryPlatformProviderConfig` in `src/lib/auth.ts`). This string is the key for the OAuth callback URL, the deny-by-default allowlist in `src/app/api/auth/[...all]/route.ts`, and `signIn.social({ provider })`. All three must agree; `src/auth.test.ts` pins it.
- **OIDC discovery** is used — no hand-wired endpoints. `discoveryUrl` points at MP's well-known config.
- **PKCE is DISABLED** (`pkce: false`) — and this is a permanent constraint, not a TODO. **MP's discovery document advertises `code_challenge_methods_supported: ["plain", "S256"]`, but MP does not honour the verifier at the token endpoint.** With PKCE on, the authorize leg succeeds and returns a code, then the exchange fails with `invalid_grant` (400) and the user lands on `/auth-error?error=invalid_code`. Verified against a live tenant on 2026-09-13. Do not re-enable this on the strength of the discovery document; `src/auth.test.ts` pins it off.
- **id_token nonce binding is DISABLED** (`disableIdTokenNonceBinding: true`). As of Better Auth 1.7 any provider with a `discoveryUrl` publishing a JWKS binds the id_token to the authorization request by default; **MP does not echo the `nonce` claim**, so leaving it on fails every sign-in with `unable_to_get_user_info`. See `../security/README.md`.
- MP requires a **`realm=realm`** authorization URL param (`authorizationUrlParams`, `src/lib/auth.ts:45-47`).
- **`getUserInfo`** fetches `${MP_BASE_URL}/oauth/connect/userinfo` with the access token and returns `{ sub, email: <synthetic>, mpEmail, name, image: undefined, emailVerified: <from claim> }`. It returns `null` (never throws) on a bad response or an unusable `sub`. **The key must be `sub`, not `id`** — Better Auth 1.7 derives the provider account key from `accountSubject`, and the 1.6 `id` shape fails with `OAUTH_ACCOUNT_SUBJECT_INVALID` after a successful token exchange.
- **`accountSubject`** is declared explicitly as `({ profile }) => String(profile.sub ?? "")`, so the account key never depends on the boot-time discovery fetch inferring `isOidc`.
- **`mapProfileToUser`** persists the OIDC `sub` as `userGuid`, and sets `email` to a **synthetic** `<sub>@mp.invalid` address so Better Auth cannot key two MP users onto one record via a shared household email. The real address is kept as `mpEmail`. See `user-identity.md` and `../security/README.md#identity`.
- **OAuth callback URL:** `${APP_URL}/api/auth/callback/ministryplatform` — the **core** `/api/auth/callback/{providerId}` pattern. Must be registered on the MP OAuth client. **This path changed in Better Auth 1.7**: genericOAuth no longer mounts its own `/api/auth/oauth2/callback/{providerId}` endpoint.
- **Sign-out is a two-step flow:** clear local Better Auth session via `auth.api.signOut(...)`, then `redirect(...)` the browser to MP's `/oauth/connect/endsession?post_logout_redirect_uri=...`.
- `id_token_hint` is **not** passed to `endsession` (optional in OIDC). `post_logout_redirect_uri` must be pre-registered on the MP OAuth client.

## genericOAuth configuration (from `src/lib/auth.ts`)

| Setting | Value | Source |
|---|---|---|
| `providerId` | `"ministryplatform"` | `ministryPlatformProviderConfig` |
| `discoveryUrl` | `${MP_BASE_URL}/oauth/.well-known/openid-configuration` | `auth.ts:36` |
| `clientId` | `process.env.MINISTRY_PLATFORM_CLIENT_ID!` | `auth.ts:37` |
| `clientSecret` | `process.env.MINISTRY_PLATFORM_CLIENT_SECRET!` | `auth.ts:38` |
| `scopes` | `["openid", "offline_access", "http://www.thinkministry.com/dataplatform/scopes/all"]` | `auth.ts:39-43` |
| `pkce` | `false` (MP advertises S256 but rejects the exchange) | `ministryPlatformProviderConfig` |
| `disableIdTokenNonceBinding` | `true` (MP omits the claim) | `ministryPlatformProviderConfig` |
| `authorizationUrlParams` | `{ realm: "realm" }` | `auth.ts:45-47` |
| `getUserInfo` | custom `fetch(${MP_BASE_URL}/oauth/connect/userinfo)` | `auth.ts:48-76` |
| `mapProfileToUser` | `{ userGuid, email: synthetic, mpEmail }` | `ministryPlatformProviderConfig` |

## `getUserInfo` implementation (verbatim)

```typescript
// src/lib/auth.ts:48-76
getUserInfo: async (tokens) => {
  // Fetch the OIDC profile to get the sub (User_GUID)
  const response = await fetch(
    `${mpBaseUrl}/oauth/connect/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(
      "getUserInfo - Failed to fetch user info:",
      response.status,
    );
    return null;
  }

  const profile = await response.json();

  return {
    id: profile.sub,
    email: profile.email,
    name: `${profile.given_name} ${profile.family_name}`,
    image: undefined,
    emailVerified: true,
  };
},
```

Notes:
- `emailVerified: true` is **hardcoded** — MP is trusted to have validated the email.
- The returned `id` (= `sub`) becomes the **`accountId`** in the account table, not `user.id`. See `user-identity.md`.

## `mapProfileToUser` implementation (verbatim)

```typescript
// src/lib/auth.ts:82-86
mapProfileToUser: (profile) => {
  return {
    userGuid: profile.id,
  } as Record<string, unknown>;
},
```

- The `Record<string, unknown>` cast is required because genericOAuth's TS type for `mapProfileToUser` doesn't surface `additionalFields`; the runtime does pass them to `createOAuthUser`.

## Sign-in flow

```
1. Browser hits protected path
2. src/proxy.ts → no session cookie → 302 /signin?callbackUrl=<original>
3. /signin (src/app/signin/page.tsx):
   - authClient.getSession() — if already signed in, redirect to callbackUrl
   - Else authClient.signIn.social({ provider: "ministryplatform", callbackURL })
4. Browser → MP /oauth/connect/authorize?... (with realm=realm, scopes)
5. User authenticates at MP
6. MP → ${APP_URL}/api/auth/callback/ministryplatform?code=...
7. Better Auth (via toNextJsHandler):
   a. Exchanges code for tokens
   b. getUserInfo(tokens) → { sub, email: <sub>@mp.invalid, mpEmail, name, emailVerified: <claim> }
   b2. accountSubject({ profile }) → sub   (the provider account key)
   c. mapProfileToUser(profile) → { userGuid: sub, email: <sub>@mp.invalid, mpEmail }
   d. Creates user (id=generated, userGuid=sub, email, name)
   e. Creates account (accountId=sub, tokens) — storeAccountCookie: true
   f. Creates session → sets JWT cookie (cookieCache)
8. Browser lands on callbackURL (app page)
9. Client-side UserProvider reads session.user.userGuid (to decide whether to load)
   → getCurrentUserProfile()  [server action re-derives the GUID from the session]
```

## Sign-in entry (verbatim from `src/app/signin/page.tsx`)

```typescript
// src/app/signin/sign-in-content.tsx
authClient.signIn.social({
  provider: "ministryplatform",
  callbackURL: sanitizeCallbackUrl(searchParams?.get("callbackUrl")),
});
```

Better Auth 1.7 removed `signIn.oauth2` along with the `genericOAuthClient`
plugin; generic providers now go through core `signIn.social`, and the field is
`provider`, not `providerId`. The page body lives in `sign-in-content.tsx`
because `page.tsx` must stay a server component to opt out of prerendering —
see `../security/README.md#nonces-force-dynamic-rendering`.

## Sign-out flow (verbatim from `src/components/user-menu/actions.ts`)

```typescript
// src/components/user-menu/actions.ts
export async function handleSignOut() {
  // Clear the Better Auth session
  await auth.api.signOut({
    headers: await headers(),
  });

  const baseUrl = process.env.MINISTRY_PLATFORM_BASE_URL;
  if (!baseUrl) {
    throw new Error('MINISTRY_PLATFORM_BASE_URL is not configured');
  }

  const endSessionUrl = `${baseUrl}/oauth/connect/endsession`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  });

  redirect(`${endSessionUrl}?${params.toString()}`);
}
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MINISTRY_PLATFORM_BASE_URL` | yes | OIDC discovery root + userinfo + endsession |
| `MINISTRY_PLATFORM_CLIENT_ID` | yes | OAuth + API client ID registered on MP |
| `MINISTRY_PLATFORM_CLIENT_SECRET` | yes | OAuth + API client secret |
| `BETTER_AUTH_URL` | yes (fallback `NEXTAUTH_URL`) | App base URL for callbacks + `post_logout_redirect_uri` |
| `BETTER_AUTH_SECRET` | yes (fallback `NEXTAUTH_SECRET`) | Session signing secret |

`NEXTAUTH_*` fallbacks exist for gradual migration from NextAuth (`src/lib/auth.ts:9-10`, `src/components/user-menu/actions.ts:20`).

## MP OAuth client setup

Register these URLs on the MP OAuth client:
- **Redirect URI:** `${APP_URL}/api/auth/callback/ministryplatform`
- **Post-logout redirect URI:** value of `BETTER_AUTH_URL` (or `NEXTAUTH_URL`)

## Gotchas
- `user.id` ≠ `userGuid`. See `user-identity.md`.
- `emailVerified` now reports the provider's actual `email_verified` claim (it used to be hardcoded `true`, which unconditionally satisfied Better Auth's implicit account-linking condition).
- `session.user.email` is a synthetic `<guid>@mp.invalid` address, NOT the user's real one. Read `mpEmail`, or `MPUserProfile.Email_Address` from `UserService`.
- PKCE disabled by design — `pkce: false` at `src/lib/auth.ts:44`. MP's OIDC provider does not support PKCE and requires the `realm=realm` workaround instead (see Key concepts above).
- No `id_token_hint` on `endsession` — `post_logout_redirect_uri` **must** be pre-registered on MP.
- `handleSignOut` falls back to `http://localhost:3000` if neither `BETTER_AUTH_URL` nor `NEXTAUTH_URL` is set (`src/components/user-menu/actions.ts:20`). Deploying without the env var will 302 to localhost.

## Related docs
- `sessions.md` — what gets stored in the JWT cookie after callback
- `user-identity.md` — `sub` → `userGuid` mapping and consumer patterns
- `route-protection.md` — `callbackUrl` preservation through the OAuth round-trip

---
title: "Step 4 — OIDC lazy discovery, id_token sub binding, dedicated OIDC client, sign-out id_token_hint"
severity: high
tags: [security, missing-test, doc]
area: auth
files: [src/lib/auth.ts, src/lib/env.ts, src/components/user-menu/actions.ts, src/components/user-menu/user-menu.tsx, src/app/auth-error/page.tsx, src/auth.test.ts, src/test-utils/mock-oidc.ts, package.json, .env.example, scripts/setup.ts, .claude/references/auth/oauth-flow.md, .claude/references/security/README.md]
discovered: 2026-09-30
discovered_by: playbook-audit (port-oidc-lazy-discovery.md, port-security-review-2026-09-28.md P4/P5)
status: resolved
---

## Problem
State **B** per `port-oidc-lazy-discovery.md`: `discoveryUrl` fetched at boot (`auth.ts:180`),
`disableIdTokenNonceBinding:true` (`:232`), no `jose`, no verifier. `getUserInfo` (`:250-316`) never verifies the
id_token, has no `sub` binding (F12's third layer), no `exp`/`azp` checks, no timeout / `redirect:"error"`, and
`fetch()`/`response.json()` can throw. The OIDC client uses `MINISTRY_PLATFORM_CLIENT_ID/SECRET` — the **same**
client as the service account (`client-credentials.ts:44`). Sign-out (`user-menu/actions.ts:23-28`) hand-builds the
endsession URL with no `client_id` / `id_token_hint`, and `user-menu.tsx:34-36` swallows failures.

## Proposed fix
Follow `S:\MP\MPNext\.claude\playbooks\port-oidc-lazy-discovery.md` Phases 2–7.
1. Phase 2: read-only curl of `https://mpi.ministryplatform.com/ministryplatformapi/oauth/.well-known/openid-configuration`
   (confirm exact path from the code) — record `jwks_uri`, algs, `connect/*` paths, RFC 9207 flag in the PR.
2. Add `jose` as a direct dependency (`npm install jose@^6`), lockfile root must show it.
3. Lazy id_token verifier + explicit `authorizationUrl`/`tokenUrl`/`userInfoUrl`/`endSessionEndpoint`; remove
   `discoveryUrl` and `disableIdTokenNonceBinding` (keep the F8/pkce comment, fix its "mitigated by PKCE" wording);
   `accountSubject` typeof form. **Keep `providerId: "ministryplatform"`** (registered redirect URI).
4. Rewrite `getUserInfo`: refuse missing id_token → verify → `sub`/`exp`/`azp` → userinfo fetch (10 s timeout,
   `redirect:"error"`, never throws) → case-insensitive `sub` match, log `auth.userinfo.sub_mismatch`. Keep the
   synthetic email, `mpEmail`, claim-derived `emailVerified`, `accountLinking:false`, `disabledPaths`.
5. **Dedicated OIDC client (owner decision 3: the OIDC client must be for this app only):** new env vars
   `MP_OIDC_CLIENT_ID` / `MP_OIDC_CLIENT_SECRET` used as the OIDC client and id_token audience. Until every
   environment has them, fall back to `MINISTRY_PLATFORM_CLIENT_ID/SECRET` with a one-time structured warning
   `auth.oidc.shared_client`. Document in `.env.example`, setup wizard, auth README. Follow-up TODO: make them
   required once environments are split.
6. Sign-out via `endSessionEndpoint` with `client_id` + `id_token_hint` if obtainable after Step 3's cookie changes;
   otherwise `client_id` + `post_logout_redirect_uri` and document. try/catch with `unstable_rethrow` first.
7. Tests: port `src/test-utils/mock-oidc.ts`; `src/auth.oidc-discovery.test.ts`; move `auth.test.ts` userinfo
   tests to signed tokens; replace pins at `auth.test.ts:461,486`; alg-confusion (HS256, `none`); F12 sub-binding.
   Mutation: restore `discoveryUrl`, run with `--testTimeout=3000`, suite must go red.
8. Phase 6 build check with `MINISTRY_PLATFORM_BASE_URL=https://mp.invalid` logs no discovery error.
9. Phase 7 docs; `/auth-error` copy for `oauth_provider_not_found`, remove `nonce_binding_missing`.

## Impact if not fixed
Any MP outage at cold start breaks sign-in until redeploy; F12's defence-in-depth layer stays missing; a single
client compromise exposes both the service account and user sign-in.

## Resolution (2026-09-30)

Branch `fix/step4-oidc-lazy-discovery`. State was **B** (`discoveryUrl`, no facade); better-auth 1.7.6
(genericOAuth fetches nothing in `init` without `discoveryUrl`).

1. **Phase 2 (mpi, read-only)** — `issuer` `…/ministryplatformapi/oauth`; `connect/{authorize,token,userinfo,
   endsession}` as expected; `jwks_uri` `…/oauth/.well-known/jwks` (not hardcoded);
   `id_token_signing_alg_values_supported: ["RS256"]`; no `authorization_response_iss_parameter_supported`;
   implicit/hybrid `response_types` advertised; `code_challenge_methods_supported: ["plain","S256"]` (still unusable).
2. **`jose ^6.2.12`** direct dependency; lockfile root lists it (one-line diff, plain `npm install`).
3. **`src/lib/auth.ts`** — explicit `authorizationUrl`/`tokenUrl`/`endSessionEndpoint`; `discoveryUrl`,
   `requireIdTokenVerification`, `disableIdTokenNonceBinding` removed; `accountSubject` typeof form;
   `providerId` kept `"ministryplatform"`. `lazyIdTokenVerifier` (5 s, `redirect:"error"`, single-flight,
   success-cached, failure never cached, fail-closed) + `verifyMpIdToken` (RS256 pinned, iss, aud = OIDC
   client). `getUserInfo`: missing id_token → verify → sub/exp/azp → userinfo (10 s, `redirect:"error"`, never
   throws) → `extractUserGuid` → case-insensitive sub binding (`auth.userinfo.sub_mismatch`). Synthetic email,
   `mpEmail`, claim-derived `emailVerified`, `accountLinking:false`, `disabledPaths`, `refuseIdTokenSignIn`
   unchanged. `sharedInstance` (one instance per process across Next bundle layers — required for the
   sign-out hint and session-row deletion).
4. **Dedicated OIDC client** — `getOidcClient()` in `src/lib/env.ts`: `MP_OIDC_CLIENT_ID`/`_SECRET`, both or
   neither; fallback to `MINISTRY_PLATFORM_CLIENT_ID`/`_SECRET` with `auth.oidc.shared_client` (once per
   process, silent during `next build`). Documented in `.env.example`, `scripts/setup.ts`, auth refs.
   Follow-up: `2026-09-30-require-dedicated-oidc-client.md`.
5. **Sign-out** — `auth.api.signOut({ body: { disableRedirect: true } })` first; `id_token_hint` taken only from an
   MP-origin URL; URL rebuilt with exact `post_logout_redirect_uri` + `client_id` always. Limitation (no hint on
   another serverless instance) documented. `user-menu.tsx`: try/catch, `unstable_rethrow` first, then alert.
6. **`/auth-error`** — retry copy for `unable_to_get_user_info`; `oauth_provider_not_found` = configuration;
   `nonce_binding_missing` removed.
7. **Tests** — new `src/auth.oidc-discovery.test.ts`, `src/auth.user-info.test.ts`,
   `src/auth.shared-instance.test.ts`; F12 "KNOWN GAP" flipped to refusal via the sub binding (hook removed +
   `discoveryUrl` re-added), plus `ID_TOKEN_NOT_SUPPORTED` with only the hook removed; config pins replace the
   old `auth.test.ts` discovery/nonce pins; mock-oidc gains per-endpoint `reject`/`http_500`/`hang`,
   `omitDiscovery`, `claims`, `foreignKey`, `signIdToken`.
8. **Mutation checks (all red)** — `discoveryUrl` restored with `--testTimeout=3000` (14/28 discovery tests,
   35 across `src/auth*`, hang cases by timeout); sub comparison forced true; algorithms pin; userinfo and
   discovery `redirect:"error"`; missing_exp; azp; failure cached; audience = service account; missing
   id_token accepted; shared-client warning; `sharedInstance` cache; `endSessionEndpoint`; `accountSubject`.
9. **Phase 6** — `MINISTRY_PLATFORM_BASE_URL=https://mp.invalid npm run build`: no discovery error. `next start`
   replay: MP unresolvable and MP hanging (a TCP listener that never answers) → `/api/auth/get-session`,
   `/sign-in/social` (200, authorize URL, no nonce/PKCE), `/signin` answer in ≤ 35 ms with **0** MP
   connections; against mpi the same, and `lazyIdTokenVerifier` loads mpi's discovery + JWKS (RS256 key found).
10. **Not done** — real-MP sign-in smoke test (needs a person and a real login).

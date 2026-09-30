---
title: "Step 4 — OIDC lazy discovery, id_token sub binding, dedicated OIDC client, sign-out id_token_hint"
severity: high
tags: [security, missing-test, doc]
area: auth
files: [src/lib/auth.ts, src/components/user-menu/actions.ts, src/components/user-menu/user-menu.tsx, src/app/auth-error/page.tsx, src/auth.test.ts, package.json, .claude/references/auth/oauth-flow.md, .claude/references/security/README.md]
discovered: 2026-09-30
discovered_by: playbook-audit (port-oidc-lazy-discovery.md, port-security-review-2026-09-28.md P4/P5)
status: open
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

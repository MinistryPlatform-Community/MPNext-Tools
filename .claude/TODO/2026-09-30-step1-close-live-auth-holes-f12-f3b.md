---
title: "Step 1 — Close live auth holes: F12 ID-token sign-in, F3b open-redirect bypass, /sign-in/social boundary"
severity: critical
tags: [security, missing-test]
area: auth
files: [src/lib/auth.ts, src/app/api/auth/[...all]/route.ts, src/app/signin/sign-in-content.tsx]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md, port-security-review-2026-09-28.md)
status: open
---

## Problem
Two findings from the upstream MPNext advisory `docs/security/2026-09-25-signin-hardening.md` were never ported:

- **F12** — `discoveryUrl` is set (`auth.ts:180`), so better-auth's `idToken` branch of `POST /sign-in/social`
  is reachable. `getUserInfo` trusts the caller-supplied `accessToken` with no `id_token.sub` ↔ userinfo `sub`
  binding. An attacker holding a victim's MP access token can sign in **as the victim**.
- **F3b** — `sanitizeCallbackUrl` (`sign-in-content.tsx:35-39`) only rejects `//` and `/\`. Browsers strip
  tab/CR/LF, so `/signin?callbackUrl=/%09/example.com` redirects a signed-in user off-site.

Also missing from the same boundary: no body-size cap / exact Content-Type / `callbackURL` length limit on
`/sign-in/social`, no `Cache-Control: no-store` on `/api/auth`, `/link-social` not in `disabledPaths`
(allowlist already 404s it — defence in depth only), `requireIdTokenVerification: true` not set, and `/signin`
echoes free-text `?error=` (`sign-in-content.tsx:56`).

## Evidence
- `src/lib/auth.ts:180` `discoveryUrl`; no `hooks` in options (`:344-392`); `getUserInfo` `:250-316` never reads `tokens.idToken`
- `src/app/api/auth/[...all]/route.ts` has a path allowlist but no body-key filter
- `src/app/signin/sign-in-content.tsx:35-39,56`

## Proposed fix
Follow `S:\MP\MPNext\.claude\playbooks\port-downstream-hardening.md` Phase 6b + Phase 7 (F3b) and
`port-security-review-2026-09-28.md` Phase 6. Reference upstream code in `S:\MP\MPNext` (`65a3225..cf5a824`).

1. `auth.ts`: `hooks.before` refusing any `idToken` in `/sign-in/social` with `ID_TOKEN_SIGN_IN_DISABLED`;
   `requireIdTokenVerification: true`; add `/link-social` to `disabledAuthPaths`.
   *(The `sub` binding inside `getUserInfo` lands in Step 4's rewrite; the hook + route filter close the path now.)*
2. `route.ts`: `allowedSignInSocialKeys = ["provider","callbackURL"]` checked on `req.clone()`; exact
   `application/json` (no comma/params); byte cap; `provider === "ministryplatform"`; `callbackURL` length cap;
   `Cache-Control: no-store` on all `/api/auth` responses.
3. `sign-in-content.tsx`: port the F3b sanitizer (control chars, any backslash, `%2f`/`%5c` in path, URL backstop,
   return the raw value). Map `?error=` through a fixed lookup, never render free text.
4. Tests: `src/auth.id-token-sign-in.test.ts` (each layer tested with the other two removed); F3b cases through a
   real query string (`%09`/`%0A`/`%0D`, `\u0085`, `/.//evil` unchanged, deep links round-trip).
5. Mutation checks (must go red, then revert): delete the hook; drop the comma check; remove `CONTROL_CHARS`;
   return the normalised form.
6. Non-production curl check against `https://mpi.ministryplatform.com`-backed local `next start`.

## Impact if not fixed
Account takeover for anyone whose MP access token leaks; open redirect usable for phishing from the app's origin.

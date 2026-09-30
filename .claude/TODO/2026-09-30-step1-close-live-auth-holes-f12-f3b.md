---
title: "Step 1 — Close live auth holes: F12 ID-token sign-in, F3b open-redirect bypass, /sign-in/social boundary"
severity: critical
tags: [security, missing-test]
area: auth
files: [src/lib/auth.ts, src/app/api/auth/[...all]/route.ts, src/app/signin/sign-in-content.tsx]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md, port-security-review-2026-09-28.md)
status: resolved
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

## Resolution (2026-09-30)

Fixed on branch `fix/step1-f12-f3b-signin-hardening`, three code commits plus this one.

### F12 — id_token sign-in (`src/lib/auth.ts`)
- `hooks.before: refuseIdTokenSignIn` refuses any `/sign-in/social` body with an
  `idToken` key (presence, not truthiness) with **404 `ID_TOKEN_SIGN_IN_DISABLED`**.
  Covers HTTP and in-process `auth.api.signInSocial` alike.
- `/link-social` added to `disabledAuthPaths` (its own id_token branch).
- `requireIdTokenVerification: true` — a discovery document without
  `issuer`/`jwks_uri` now skips the provider (sign-in 404s `PROVIDER_NOT_FOUND`)
  instead of silently leaving the id_token unverified. Checked: MP's
  `mpi.ministryplatform.com` document publishes both, and a local `next start`
  against it still returns the authorize URL.
- `providerId: "ministryplatform"` (no hyphen) is unchanged.

### `/sign-in/social` boundary (`src/app/api/auth/[...all]/route.ts`)
Plain 404 (Better Auth never called) unless: raw Content-Type matches
`/^application\/json[\t ]*(;|$)/i` with no comma; declared Content-Length and
the streamed `clone()` are both ≤ 4096 bytes; body is a JSON object with keys ⊆
`["provider","callbackURL"]`; `provider === "ministryplatform"`; `callbackURL`
is a string ≤ 2048 chars. `Cache-Control: no-store` on every `/api/auth`
response, 404s included (`withNoStore` copies immutable-header responses).

### F3b + `?error=` (`src/app/signin/sign-in-content.tsx`)
Sanitizer ported from upstream `b7dc8e6`: refuses C0/DEL/C1, any backslash,
`%2F`/`%5C` in the path, and off-origin resolution; returns the raw value.
`?error=` is only a lookup key into a fixed `Map`; unknown codes get a generic
message; the raw value is neither rendered nor logged.

### Tests
- New `src/auth.id-token-sign-in.test.ts` (node env): real `auth` instance vs a
  mock MP OIDC provider with really RS256-signed id_tokens; `fetch` throws for
  any other URL. Hook over HTTP and in-process, `idToken: null/{}/false`,
  control (normal flow → authorize URL), `/link-social` 404 + reopened control,
  `requireIdTokenVerification` with a no-`jwks_uri` document + flag-off control.
- `route.test.ts`: body filter with Better Auth mocked out (so the hook is out of
  the way) — every refusal asserts the handler was never called; chunked
  oversize body, declared length, NBSP/comma/`+json` Content-Types, duplicate
  keys, `__proto__`, BOM; no-store on every path.
- `page.test.tsx`: F3b cases as strings and through a real query string
  (`%09`/`%0A`/`%0D`/`%C2%85`/`%252F`…) on both sinks; `/.//evil.example`
  unchanged; deep links round-trip; `?error=` free text never rendered/logged.

### Mutation checks (each went red, then reverted)
Delete hook wiring (6 red); presence→truthiness (2); drop `/link-social` (2);
drop `requireIdTokenVerification` (2); drop comma check (1); key allowlist (≥6);
provider check (4); streamed byte cap (1 — after fixing the test to pad with JSON
whitespace, it initially survived); declared-length cap (1); `callbackURL` cap
(1); `withNoStore` (2); `trim()` the Content-Type (1); remove `CONTROL_CHARS`
(7, incl. new on-origin `/tools\t/x` cases — the original `/%09/` cases are also
caught by the `new URL` backstop, and go red when both are removed); return the
normalised form (2); drop backslash rule (2); drop encoded-separator rule (6);
echo unknown `?error=` (5).

### Deliberately deferred
- **Step 4:** `id_token.sub` ↔ userinfo `sub` binding in `getUserInfo`, and
  removing `discoveryUrl`. The test "KNOWN GAP until Step 4" in
  `src/auth.id-token-sign-in.test.ts` shows the substituted token still signs in
  as the victim **when the hook is removed**, and must be flipped to a refusal
  when the binding lands.
- **Step 3:** `advanced.ipAddress` / `AUTH_IP_ADDRESS_HEADERS` /
  `AUTH_TRUSTED_PROXIES` (rate-limit bucket) from the same security-review phase.

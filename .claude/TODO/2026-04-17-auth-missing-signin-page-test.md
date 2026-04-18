---
title: No test coverage for `/signin` page OAuth redirect logic
severity: medium
tags: [missing-test]
area: auth
files: [src/app/signin/page.tsx]
discovered: 2026-04-17
discovered_by: auth
status: open
---

## Problem
`src/app/signin/page.tsx` contains non-trivial logic: it calls `authClient.getSession()`, redirects to the `callbackUrl` if already signed in, else kicks off `authClient.signIn.oauth2({ providerId: "ministry-platform", callbackURL })`. If `getSession()` rejects, it falls through to initiating sign-in anyway (error path). None of this is covered by a test file.

This is the primary client-side entry for OAuth and the anchor point for `callbackUrl` preservation. A regression here (e.g., dropping `callbackURL`, wrong `providerId` string) would silently break the OAuth round-trip for every user.

## Evidence
- No `src/app/signin/page.test.tsx` in the test inventory (`.claude/references/_meta/facts/2026-04-17.md`, 37 test files listed).
- Logic covered: `src/app/signin/page.tsx:14-41` (useEffect branches for already-signed-in, not-signed-in, and error fall-through).
- Complementary proxy/AuthWrapper tests exist (`src/proxy.test.ts`, `src/components/layout/auth-wrapper.test.tsx`) but stop at the redirect to `/signin` — no test asserts what `/signin` does next.

## Proposed fix
Add `src/app/signin/page.test.tsx` covering:
1. `authClient.getSession()` resolves with a session → `window.location.href` is set to `callbackUrl`.
2. `authClient.getSession()` resolves with `null` and `isRedirecting=false` → `authClient.signIn.oauth2` called with `{ providerId: "ministry-platform", callbackURL: <callbackUrl> }`.
3. `authClient.getSession()` rejects → error-path still calls `authClient.signIn.oauth2` with the same args.
4. `callbackUrl` defaults to `"/"` when `searchParams` has no `callbackUrl` key.

Use `@testing-library/react` + hoisted mocks for `@/lib/auth-client` and `next/navigation`'s `useSearchParams`. Mock `window.location.href` setter.

## Impact if not fixed
A typo in `providerId`, dropping `callbackURL`, or regressing the already-signed-in short-circuit silently breaks the entire auth flow in production. No CI signal would catch it.

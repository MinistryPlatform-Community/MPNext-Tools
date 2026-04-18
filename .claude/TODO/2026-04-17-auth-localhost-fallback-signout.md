---
title: `handleSignOut` silently falls back to `http://localhost:3000` if env vars missing
severity: medium
tags: [bug, security]
area: auth
files: [src/components/user-menu/actions.ts]
discovered: 2026-04-17
discovered_by: auth
status: open
---

## Problem
`src/components/user-menu/actions.ts:20` uses `process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'` as the `post_logout_redirect_uri` when redirecting to MP's `endsession`. A production deployment missing both env vars will 302 a real signed-out user to `http://localhost:3000` — either a dead URL or a local dev environment on the operator's machine.

Contrast with line 14–16, which throws when `MINISTRY_PLATFORM_BASE_URL` is missing. The same loud-fail treatment should apply here.

Relatedly, MP's OAuth client likely won't have `http://localhost:3000` in its `post_logout_redirect_uri` allowlist in production, so the redirect will fail — but the browser will have already cleared the Better Auth session, leaving the user in an inconsistent state.

## Evidence
- `src/components/user-menu/actions.ts:18-23`:
  ```typescript
  const endSessionUrl = `${baseUrl}/oauth/connect/endsession`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  });
  redirect(`${endSessionUrl}?${params.toString()}`);
  ```
- Test `src/components/user-menu/actions.test.ts:63-68` covers the missing-`MINISTRY_PLATFORM_BASE_URL` throw case, but there is no test for the missing `BETTER_AUTH_URL`/`NEXTAUTH_URL` case.

## Proposed fix
1. Throw (or log-and-throw) when neither `BETTER_AUTH_URL` nor `NEXTAUTH_URL` is set, matching the existing `MINISTRY_PLATFORM_BASE_URL` pattern.
2. Add a test case asserting the throw.
3. Consider centralizing app-URL resolution (e.g., `src/lib/config.ts` or equivalent) so `auth.ts` and `actions.ts` share one source of truth with one error message.

## Impact if not fixed
In a misconfigured production deploy, signing out redirects users to a dead `localhost` URL while the MP session is still live (MP rejects the redirect). User experience: broken sign-out. Operator debugging: hard, because the fallback hides the misconfiguration.

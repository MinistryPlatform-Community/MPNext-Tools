---
title: Sign-out silently falls back to http://localhost:3000 when BETTER_AUTH_URL unset
severity: medium
tags: [bug, security]
area: components
files:
  - src/components/user-menu/actions.ts
discovered: 2026-04-17
discovered_by: components-user-menu
status: open
---

## Problem
`handleSignOut` uses `process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'` as the `post_logout_redirect_uri`. In a production deployment that forgets to set `BETTER_AUTH_URL`/`NEXTAUTH_URL`, signing out redirects users through MP's `endsession` and back to `http://localhost:3000`, which either fails to load or (worse on a dev's machine) lands on an unrelated local app. This is inconsistent with `src/lib/auth.ts`, which treats these env vars as required and will fail earlier.

## Evidence
- `src/components/user-menu/actions.ts:20` — `process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'`
- `src/lib/auth.ts` — Better Auth config requires `BETTER_AUTH_URL` (or `NEXTAUTH_URL`) for callbacks; absence would have already broken sign-in
- `CLAUDE.md` lists `BETTER_AUTH_URL` (or `NEXTAUTH_URL` fallback) as a **Required Environment Variable**

## Proposed fix
Replace the fallback with a throw that matches the `MINISTRY_PLATFORM_BASE_URL` check already in the same file:

```typescript
const redirectUri = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL;
if (!redirectUri) {
  throw new Error('BETTER_AUTH_URL (or NEXTAUTH_URL) is not configured');
}
const params = new URLSearchParams({ post_logout_redirect_uri: redirectUri });
```

Update `src/components/user-menu/actions.test.ts` to add a case asserting the throw.

## Impact if not fixed
- Users see a broken logout in production environments that omit the env var.
- Minor info-leak: if the MP OAuth client has `http://localhost:3000` registered (common in dev configs that bleed into prod), an attacker could redirect through MP's `endsession` to a local attacker-controlled listener on port 3000.
- Diagnostic confusion: logout "works" on the dev's machine and "fails" in prod with no obvious server-side signal.

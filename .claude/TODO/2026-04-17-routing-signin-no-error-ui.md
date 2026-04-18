---
title: /signin page silently retries OAuth on getSession failure, no error UI
severity: low
tags: [bug, refactor]
area: routing
files: [src/app/signin/page.tsx]
discovered: 2026-04-17
discovered_by: routing
status: open
---

## Problem
`src/app/signin/page.tsx:30-40` catches errors from `authClient.getSession()` and immediately kicks off `authClient.signIn.oauth2(...)`. If the OAuth redirect itself fails (network down, misconfigured provider, callback loop), the user sees only the "Redirecting to sign in..." spinner forever — no error surface, no retry button, no way back.

There is no `?error=...` handling either: OAuth providers commonly redirect back to `/signin?error=access_denied` on user cancellation, and the current page ignores it.

## Evidence
- `src/app/signin/page.tsx:30-40` — catch branch always calls `setIsRedirecting(true)` + `oauth2()`
- `src/app/signin/page.tsx:8-9` — only `callbackUrl` is read from `searchParams`; `error` is ignored
- `src/app/signin/page.tsx:43-51` — render returns a spinner unconditionally; no error state

## Proposed fix
1. Read `searchParams.get('error')` and render an error card with a retry button when set.
2. Add a client-side timeout (e.g. 10s) that flips to an error state if the redirect hasn't navigated away.
3. Log the error with `console.error` including the provider response (do not swallow silently).

## Impact if not fixed
- Users experiencing OAuth failures see an infinite spinner with no actionable feedback
- Support burden: "the login page is stuck" reports with no breadcrumb

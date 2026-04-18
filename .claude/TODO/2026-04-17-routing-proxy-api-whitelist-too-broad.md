---
title: Proxy public-path whitelist blanket-allows all /api/* routes
severity: medium
tags: [security, refactor]
area: routing
files: [src/proxy.ts]
discovered: 2026-04-17
discovered_by: routing
status: open
---

## Problem
`src/proxy.ts:18` whitelists **any** path starting with `/api`, not just `/api/auth/*`. Today the only `/api` route is the Better Auth catch-all (`src/app/api/auth/[...all]/route.ts`), so this is harmless. But if an authenticated data/API route is added later under `/api/` (e.g. `/api/tools/deploy`), the edge proxy will allow unauthenticated requests through — the route will then depend entirely on in-handler session checks. This is a footgun: developers routinely assume proxy-level gating and forget to re-check inside handlers.

## Evidence
- `src/proxy.ts:18` — `if (pathname.startsWith('/api') || pathname === '/signin')`
- `src/app/api/` currently contains only `auth/[...all]/route.ts` (verified via `ls`)
- `src/proxy.test.ts:68-73` — test explicitly covers "nested /api paths without session check" (any `/api/*` passes)

## Proposed fix
Tighten the whitelist to the exact Better Auth prefix:

```typescript
if (pathname.startsWith('/api/auth') || pathname === '/signin') {
```

If other unauthenticated API routes are intentionally desired in the future, add them explicitly. Update `src/proxy.test.ts` accordingly — the "nested /api paths" test should become "nested /api/auth paths" and a new test should assert that `/api/other` is gated.

## Impact if not fixed
- Low today (no other `/api` routes exist)
- Medium going forward: invisible auth bypass for any future `/api/*` route that relies on proxy gating

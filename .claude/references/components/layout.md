---
title: Layout & Shared Actions
domain: components
type: reference
applies_to:
  - src/components/layout/auth-wrapper.tsx
  - src/components/layout/auth-wrapper.test.tsx
  - src/components/layout/index.ts
  - src/components/shared-actions/user.ts
  - src/components/shared-actions/user.test.ts
  - src/components/shared-actions/README.md
symbols: [AuthWrapper, getCurrentUserProfile]
related:
  - ../auth/README.md
  - ../routing/README.md
  - ../services/README.md
  - tool-framework.md
last_verified: 2026-09-13
---

## Purpose
`AuthWrapper` is the server-side session gate used at the app-shell level; it redirects unauthenticated requests to `/signin` while preserving the original path+query as `callbackUrl`. `shared-actions/` holds server actions used across multiple features (currently just `getCurrentUserProfile`).

## Files
- `src/components/layout/auth-wrapper.tsx` — server component, 31 lines
- `src/components/layout/auth-wrapper.test.tsx` — redirect + callback preservation tests
- `src/components/layout/index.ts` — barrel: `AuthWrapper`
- `src/components/shared-actions/user.ts` — `getCurrentUserProfile` server action
- `src/components/shared-actions/user.test.ts` — unit tests for the action
- `src/components/shared-actions/README.md` — when-to-shard-vs-colocate guidelines

## Key concepts
- `AuthWrapper` is an **async React Server Component**. No `"use client"` — it uses `next/headers` + `auth.api.getSession()` directly. Do not add interactivity to this file; wrap client state in a child component.
- Session validation is stateless: `auth.api.getSession({ headers })` reads the Better Auth JWT cookie (see `../auth/README.md`).
- Redirect uses a synthetic `http://placeholder` base so we can use `URL` + `searchParams` to build the querystring safely without string concat.
- The `x-pathname` header is set upstream by the proxy (`src/proxy.ts`) so the server component can see the original requested URL; it falls back to `/` when absent.
- `shared-actions/user.ts` is marked `'use server'` at the top of the file — all exports are server actions.
- Shared actions re-validate auth inside each action (`auth.api.getSession(...)`) — they do not trust the caller.
- `getCurrentUserProfile` takes **no parameters**. The MP `User_GUID` is derived from the session inside the action. A caller-supplied GUID would be a live IDOR: server actions are caller-shaped POST endpoints, so any authenticated MP user could have read another user's contact details, roles, and user groups.
- The guard keys on a non-empty-string `session.user.userGuid` (declared `required: true` in `src/lib/auth.ts`), not `session.user.id` — the latter is Better Auth's internal ID and its presence does not prove an MP identity exists.

## API / Interface

### `AuthWrapper`
Source: `src/components/layout/auth-wrapper.tsx:5`
```typescript
export async function AuthWrapper({ children }: { children: React.ReactNode })
```

Full implementation (real source):
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function AuthWrapper({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    // Preserve the originally requested URL (pathname + search) so the
    // user lands back on the exact tool + params they asked for after
    // completing OAuth. The proxy forwards this via x-pathname.
    const originalPath = hdrs.get("x-pathname") || "/";
    const signinUrl = new URL("/signin", "http://placeholder");
    signinUrl.searchParams.set("callbackUrl", originalPath);
    redirect(`${signinUrl.pathname}${signinUrl.search}`);
  }

  // A session without a userGuid is unusable: every MP lookup keys off userGuid,
  // and without it the header avatar/menu never renders — which leaves the user
  // with no way to even sign out (the trap behind the better-auth 1.6 regression).
  // Route these broken sessions to a recovery page that CAN sign them out,
  // rather than rendering a dead app. /session-error lives outside the (web)
  // route group, so it is not wrapped by AuthWrapper and cannot redirect-loop.
  const userGuid = (session.user as { userGuid?: string | null }).userGuid;
  if (!userGuid) {
    redirect("/session-error");
  }

  return <>{children}</>;
}
```

### `getCurrentUserProfile`
Source: `src/components/shared-actions/user.ts:25`
```typescript
export async function getCurrentUserProfile(): Promise<MPUserProfile | undefined>
```

Implementation (docstring elided — see source for the IDOR rationale):
```typescript
'use server';

import { auth } from '@/lib/auth';
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { UserService } from '@/services/userService';
import { headers } from 'next/headers';

export async function getCurrentUserProfile(): Promise<MPUserProfile | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userGuid = (session?.user as Record<string, unknown> | undefined)?.userGuid;
  if (typeof userGuid !== 'string' || userGuid.length === 0) throw new Error('Unauthorized');

  const userService = await UserService.getInstance();
  return userService.getUserProfile(userGuid);
}
```

## How it works
- **`AuthWrapper` flow**
  1. `await headers()` (Next.js 16 async dynamic API)
  2. `auth.api.getSession({ headers })` — Better Auth reads the JWT cookie, returns `null` if invalid/missing
  3. On `null`, read `x-pathname` (set by `src/proxy.ts`), build `/signin?callbackUrl=<originalPath>`, call `next/navigation` `redirect()` (which throws internally to abort rendering)
  4. On a session with no `userGuid`, `redirect("/session-error")` — that route sits outside the `(web)` group, so it is not itself wrapped and cannot loop
  5. On valid session, render `<>{children}</>`

- **`getCurrentUserProfile` flow**
  1. Re-validate session via `auth.api.getSession()` — if `session.user.userGuid` is not a non-empty string, throw `Unauthorized`
  2. Await `UserService.getInstance()` (async singleton)
  3. Delegate to `userService.getUserProfile(userGuid)` and return the `MPUserProfile` (or `undefined`)

## Shared Actions catalog
| Export | File | Purpose |
|---|---|---|
| `getCurrentUserProfile()` | `src/components/shared-actions/user.ts:25` | Fetch the **calling** user's MP profile (`MPUserProfile`); `User_GUID` comes from the session, never from a parameter. Throws `Unauthorized` if the session has no `userGuid`. Backed by `UserService.getUserProfile`. |

Guidelines (verbatim from `src/components/shared-actions/README.md`):
- Place actions here when they are **used by multiple components across different features**, provide **shared utility**, or handle **cross-cutting concerns**.
- Keep actions **co-located** when they are feature-specific or tightly coupled to a single feature's logic.

## Tests
- `src/components/layout/auth-wrapper.test.tsx` — 6 cases:
  - redirects with `callbackUrl` from `x-pathname`
  - falls back to `/` when `x-pathname` is missing
  - preserves URL-encoded query params through the redirect
  - redirects to `/session-error` when `userGuid` is absent
  - redirects to `/session-error` when `userGuid` is `null`
  - returns children when authenticated
- `src/components/shared-actions/user.test.ts` — 6 cases:
  - looks the profile up with the session's `userGuid` and returns it
  - ignores a caller-forged argument (cast through `unknown`) and still uses the session GUID
  - throws `Unauthorized` when the session has no `userGuid`
  - throws `Unauthorized` when `userGuid` is an empty string
  - throws `Unauthorized` when `auth.api.getSession()` returns `null`
  - propagates service-layer errors

Both test files use `vi.hoisted()` to share mock references (required pattern — see `../testing/README.md`).

## Gotchas
- **Must stay a server component.** Adding `"use client"` to `auth-wrapper.tsx` silently breaks auth — client components cannot call `auth.api.getSession()` with server headers. Put any interactive state into a child that you render from inside `<AuthWrapper>`.
- **`redirect()` throws.** `next/navigation` `redirect()` aborts rendering by throwing a magic error. Do not wrap in try/catch; do not add code after the redirect call expecting it to run on the unauthenticated branch.
- **`callbackUrl` relies on `x-pathname`.** If a route bypasses the proxy (or a future proxy matcher excludes it), `x-pathname` will be missing and unauthenticated users land on `/` after sign-in. Verify proxy matcher coverage in `src/proxy.ts` when adding new protected routes.
- **Shared actions must re-validate auth.** `getCurrentUserProfile` calls `auth.api.getSession()` itself rather than trusting caller context. Any new action added here must do the same (see `../auth/README.md` for session access patterns).
- **Never re-add an identity parameter.** `getCurrentUserProfile` is a CLAUDE.md rule-12 carve-out from the `AuthorizationService` gate on the grounds that it returns only the caller's own profile. That justification holds only because there is no GUID argument to forge; adding one re-opens the IDOR.

## Related docs
- `../auth/README.md` — Better Auth session shape, `session.user.userGuid` vs `session.user.id`
- `../routing/README.md` — `src/proxy.ts` sets `x-pathname` for downstream server components
- `../services/README.md` — `UserService` singleton used by `getCurrentUserProfile`
- `tool-framework.md` — `ToolContainer` is the per-page shell that runs inside `<AuthWrapper>`

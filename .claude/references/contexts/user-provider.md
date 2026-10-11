---
title: UserProvider and useUser
domain: contexts
type: reference
applies_to: [src/contexts/user-context.tsx, src/contexts/user-context.test.tsx, src/app/providers.tsx]
symbols: [UserProvider, useUser, MPUserProfile]
related: [session.md, ../auth/README.md, ../services/README.md]
last_verified: 2026-10-10
---

## Purpose
Client context that watches the Better Auth session, extracts `userGuid` (OIDC `sub` → MP `User_GUID`), and loads the display-only `MPUserProfile` (names + email; no IDs, roles, or groups) via the `getCurrentUserProfile` server action. The load is **lazy**: nothing is fetched until a component calls `useUser()`. `userGuid` gates *whether* the load fires; the action re-derives it server-side and takes no argument.

Kept as an **extension point** for tools built on the template: no component outside `src/contexts/` calls `useUser()` today (the header `UserMenu` was removed in #54), so the mounted provider costs nothing until a tool opts in.

## Files
- `src/contexts/user-context.tsx` — provider + hook + error handling
- `src/contexts/user-context.test.tsx` — 14 test cases covering load/error/refresh/missing-guid, edge branches, and lazy fetch
- `src/app/providers.tsx` — mounts `<UserProvider>` at the app shell
- `src/components/shared-actions/user.ts` — `getCurrentUserProfile()` server action (no parameters; derives the GUID from the session)
- `src/services/userService.ts` — `UserService.getUserProfile(guid)` downstream lookup
- `src/lib/providers/ministry-platform/types/user-profile.types.ts` — `MPUserProfile` shape

## Key concepts
- **Lazy, client-side profile load** — MP profile is fetched after the first `useUser()` consumer mounts, not on provider mount and not injected by the server. Page renders before `userProfile` is available (`isLoading` starts `true`).
- **One load, shared** — `useUser()` runs an effect that calls an internal `requestProfile()` (from a private `UserProfileRequestContext`), which sets the provider's `requested` state to `true`. Setting it again is a React bail-out, so N consumers cause one fetch. The private context keeps `useUser()`'s return shape unchanged.
- **`userGuid` is the key** — `session.user.id` is Better Auth's internal ID; `session.user.userGuid` is the MP `User_GUID`. Only `userGuid` is used for MP lookups (`user-context.tsx:40-42`).
- **Effect gating** — the provider effect does nothing until `requested`; then it fires load when `!isPending && userGuid`, and the else-branch (`!isPending && !session`) clears state. If the session exists but has no `userGuid`, **neither branch runs** (test: "should not fetch profile when session has no userGuid").
- **Error state is local** — `getCurrentUserProfile` rejections are caught; `error` is exposed on context, `userProfile` is reset to `null`, `isLoading` ends `false`.
- **`useUser` throws outside a provider** — guard at the end of `useUser()`.

## API / Interface

```typescript
// src/contexts/user-context.tsx
interface UserContextValue {
  userProfile: MPUserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshUserProfile: () => Promise<void>;
}

export function UserProvider({ children }: UserProviderProps): JSX.Element;
export function useUser(): UserContextValue;
```

```typescript
// src/lib/providers/ministry-platform/types/user-profile.types.ts
export interface MPUserProfile {
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
}
```

## How it works
- On mount: `const { data: session, isPending } = authClient.useSession()`; `requested` starts `false` — **no fetch yet**.
- `userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid`.
- A consumer's `useUser()` effect calls `requestProfile()` → `setRequested(true)` (idempotent).
- Provider `useEffect` fires `loadUserProfile()` when `requested && !isPending && userGuid`.
- `loadUserProfile`:
  - Sets `isLoading=true`, `error=null`.
  - Calls `getCurrentUserProfile()` — no argument; the action re-derives the GUID from the server-side session.
  - On success: `setUserProfile(profile ?? null)`.
  - On failure: `setError(Error)`, `setUserProfile(null)`.
  - `finally` block sets `isLoading=false`.
- `refreshUserProfile()` re-invokes `loadUserProfile` with the current `userGuid` closure.
- Context value is memoized via `useMemo`.

## Usage

From `src/app/providers.tsx`:

```typescript
"use client";

import { UserProvider } from "@/contexts/user-context";
import { Toaster } from "sonner";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <UserProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </UserProvider>
  );
}
```

Consumer hook (from `src/contexts/user-context.tsx`):

```typescript
export function useUser() {
  const context = useContext(UserContext);
  const requestProfile = useContext(UserProfileRequestContext);

  // The first mounted consumer triggers the provider's one profile load.
  useEffect(() => {
    requestProfile?.();
  }, [requestProfile]);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
```

## Load lifecycle (call graph)

```
UserProvider mount                      (no fetch; requested = false)
  └─ authClient.useSession()            → { data: session, isPending }
     └─ userGuid = session.user.userGuid
first useUser() consumer mounts
  └─ useEffect → requestProfile()       → setRequested(true)  (later consumers: no-op)
     └─ provider useEffect [requested && !isPending && userGuid]
           └─ loadUserProfile()
              └─ getCurrentUserProfile()                 (server action: src/components/shared-actions/user.ts:25)
                 └─ auth.api.getSession({ headers })     (re-verifies session; throws Unauthorized unless user.userGuid is a non-empty string)
                 └─ UserService.getInstance()
                 └─ UserService.getUserProfile(userGuid) (src/services/userService.ts — GUID from the session, never the caller)
                    └─ MP getTableRecords dp_Users (filter: User_GUID = '...'; single query, 4 Contact_ID_TABLE fields)
              └─ setUserProfile | setError
              └─ setIsLoading(false)
```

## Test coverage (`user-context.test.tsx`)

| Test | Line | Asserts |
|---|---|---|
| throws outside provider | 34 | `useUser()` without `<UserProvider>` throws |
| loads profile when session has userGuid | 47 | `getCurrentUserProfile` called with **no arguments**, profile set, `error` null |
| null profile when no session | 72 | `data: null` → `userProfile=null`, action not called |
| no fetch when session lacks userGuid | 88 | `data: { user: { id } }` (no `userGuid`) → action not called |
| handles profile load error | 101 | rejected promise → `error` set, `userProfile=null` |
| `refreshUserProfile` re-fetches | 119 | second call returns updated profile; action called twice |
| refresh with no `userGuid` clears profile | 160 | guard inside `loadUserProfile`; action not called |
| stays loading while session pending | 177 | `isPending: true` → `isLoading` stays `true` |
| non-Error rejection wrapped | 186 | `error` is a real `Error` ("Failed to load user profile") |
| undefined profile → no profile | 202 | `profile ?? null` |
| error cleared on successful refresh | 217 | `setError(null)` before reload |
| no call when nothing calls `useUser()` | 246 | provider mounted with a `userGuid` session but no consumer → action not called |
| two consumers share one call | 264 | both consumers see the profile; action called once |
| late consumer triggers the call | 288 | no call until a consumer is rendered; then exactly one |

## Gotchas
- Reading `useUser().userProfile` before load returns `null` — gate UI on `isLoading`.
- Consumer must be a client component and wrapped by `<UserProvider>` — the hook throws otherwise.
- Once requested, the profile stays loaded for the provider's lifetime even if every consumer unmounts — `requested` never resets; a session/`userGuid` change re-runs the load.
- Session without `userGuid` leaves `isLoading` at its previous value — if the session switches to "missing guid" mid-lifecycle, neither branch of the effect clears it. Prefer `useAppSession` + explicit checks in components that need to distinguish "loading" vs "guid missing".
- Direct import from `@/lib/auth-client` bypasses the `useAppSession` wrapper — `UserProvider` itself does this because it needs `isPending` which `useAppSession` drops.

## Related docs
- `session.md` — why `useAppSession` is separate
- `../auth/oauth-flow.md` — how `userGuid` is populated on the session (OIDC `sub`)
- `../services/README.md` — `UserService.getUserProfile` implementation

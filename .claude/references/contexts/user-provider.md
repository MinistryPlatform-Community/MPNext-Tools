---
title: UserProvider and useUser
domain: contexts
type: reference
applies_to: [src/contexts/user-context.tsx, src/contexts/user-context.test.tsx, src/app/providers.tsx]
symbols: [UserProvider, useUser, MPUserProfile]
related: [session.md, ../auth/README.md, ../services/README.md]
last_verified: 2026-04-17
---

## Purpose
Client context that watches the Better Auth session, extracts `userGuid` (OIDC `sub` → MP `User_GUID`), and loads the enriched `MPUserProfile` (roles + groups) via the `getCurrentUserProfile` server action.

## Files
- `src/contexts/user-context.tsx` — provider + hook + error handling
- `src/contexts/user-context.test.tsx` — 6 test cases covering load/error/refresh/missing-guid
- `src/app/providers.tsx` — mounts `<UserProvider>` at the app shell
- `src/components/shared-actions/user.ts` — `getCurrentUserProfile(id)` server action
- `src/services/userService.ts:81` — `UserService.getUserProfile(id)` downstream lookup
- `src/lib/providers/ministry-platform/types/user-profile.types.ts` — `MPUserProfile` shape

## Key concepts
- **Client-side profile load** — MP profile is fetched after mount, not injected by the server. Page renders before `userProfile` is available (`isLoading` starts `true`).
- **`userGuid` is the key** — `session.user.id` is Better Auth's internal ID; `session.user.userGuid` is the MP `User_GUID`. Only `userGuid` is used for MP lookups (`user-context.tsx:27-29`).
- **Effect gating** — the effect only fires load when `!isPending && userGuid`; the else-branch (`!isPending && !session`) clears state. If the session exists but has no `userGuid`, **neither branch runs** (`user-context.tsx:51-58`; test at `user-context.test.tsx:88-99`).
- **Error state is local** — `getCurrentUserProfile` rejections are caught; `error` is exposed on context, `userProfile` is reset to `null`, `isLoading` ends `false` (`user-context.tsx:43-48`).
- **`useUser` throws outside a provider** — guard at `user-context.tsx:78-80`.

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
  User_ID: number;
  User_GUID: string;
  Contact_ID: number;
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
  Mobile_Phone: string | null;
  Image_GUID: string | null;
  roles: string[];
  userGroups: string[];
}
```

## How it works
- On mount: `const { data: session, isPending } = authClient.useSession()`.
- `userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid`.
- `useEffect` fires `loadUserProfile()` when `!isPending && userGuid` truthy.
- `loadUserProfile`:
  - Sets `isLoading=true`, `error=null`.
  - Calls `getCurrentUserProfile(userGuid)`.
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

export function Providers({ children }: ProvidersProps) {
  return (
    <UserProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </UserProvider>
  );
}
```

Consumer hook (from `src/contexts/user-context.tsx:76-82`):

```typescript
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
```

## Load lifecycle (call graph)

```
UserProvider mount
  └─ authClient.useSession()            → { data: session, isPending }
     └─ userGuid = session.user.userGuid
        └─ useEffect [!isPending && userGuid]
           └─ loadUserProfile()
              └─ getCurrentUserProfile(userGuid)         (server action: src/components/shared-actions/user.ts)
                 └─ auth.api.getSession({ headers })     (re-verifies session server-side)
                 └─ UserService.getInstance()
                 └─ UserService.getUserProfile(id)       (src/services/userService.ts:81)
                    ├─ MP getTableRecords dp_Users (filter: User_GUID = '...')
                    ├─ MP getTableRecords dp_User_Roles (filter: User_ID = ...)
                    └─ MP getTableRecords dp_User_User_Groups (filter: User_ID = ...)
              └─ setUserProfile | setError
              └─ setIsLoading(false)
```

## Test coverage (`user-context.test.tsx`)

| Test | Line | Asserts |
|---|---|---|
| throws outside provider | 34 | `useUser()` without `<UserProvider>` throws |
| loads profile when session has userGuid | 47 | `getCurrentUserProfile` called with guid, profile set, `error` null |
| null profile when no session | 72 | `data: null` → `userProfile=null`, action not called |
| no fetch when session lacks userGuid | 88 | `data: { user: { id } }` (no `userGuid`) → action not called |
| handles profile load error | 101 | rejected promise → `error` set, `userProfile=null` |
| `refreshUserProfile` re-fetches | 119 | second call returns updated profile; action called twice |

## Gotchas
- Reading `useUser().userProfile` before load returns `null` — gate UI on `isLoading` (inline; `user-context.tsx:24,51-58`).
- Consumer must be a client component and wrapped by `<UserProvider>` — the hook throws otherwise (`user-context.tsx:78-80`).
- Session without `userGuid` leaves `isLoading` at its previous value — if the session switches to "missing guid" mid-lifecycle, neither branch of the effect clears it (`user-context.tsx:51-58`). Prefer `useAppSession` + explicit checks in components that need to distinguish "loading" vs "guid missing".
- Direct import from `@/lib/auth-client` bypasses the `useAppSession` wrapper — `UserProvider` itself does this (`user-context.tsx:22`) because it needs `isPending` which `useAppSession` drops.

## Related docs
- `session.md` — why `useAppSession` is separate
- `../auth/oauth-flow.md` — how `userGuid` is populated on the session (OIDC `sub`)
- `../services/README.md` — `UserService.getUserProfile` implementation

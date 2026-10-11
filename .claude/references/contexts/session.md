---
title: useAppSession wrapper
domain: contexts
type: reference
applies_to: [src/contexts/use-app-session.ts, src/contexts/use-app-session.test.ts]
symbols: [useAppSession, SessionData]
related: [user-provider.md, ../auth/README.md]
last_verified: 2026-10-10
---

## Purpose
Thin hook that returns only the `data` portion of Better Auth's `authClient.useSession()`. Encapsulates the session-access pattern so callers don't destructure `{ data, isPending, error }` inline at every consumer.

## Files
- `src/contexts/use-app-session.ts` — `useAppSession()` + `SessionData` type alias
- `src/contexts/use-app-session.test.ts` — 2 test cases (passthrough + null)
- `src/lib/auth-client.ts` — `authClient = createAuthClient({ plugins: [customSessionClient<typeof auth>()] })` (no `genericOAuthClient()` — removed in Better Auth 1.7; see the note in that file)

## Key concepts
- **Not a React Context** — `use-app-session.ts` defines no `createContext`; it is purely a hook module.
- **Extension point, no current consumers** — nothing outside `src/contexts/` imports `useAppSession` (the header `UserMenu` that used it was removed in #54); it is kept, with `useUser()`, as the template's documented client-side session/profile surface for new tools. It makes no MP call (session data only).
- **`authClient.useSession()` is a Better Auth nanostore hook** — provided by `better-auth/react`; refetches on visibility / network events.
- **`SessionData` is inferred from `authClient.$Infer.Session`** — the `customSessionClient<typeof auth>()` plugin flows server-side `customSession` return types to the client.
- **`userGuid`** lives on `session.user` because of the server-side `customSession` plugin (see `../auth/`), but its type is not part of `SessionData` by default — consumers assert via `(session?.user as { userGuid?: string })` (example: `src/contexts/user-context.tsx:42`).

## API / Interface

```typescript
// src/contexts/use-app-session.ts
"use client";

import { authClient } from "@/lib/auth-client";

export type SessionData = typeof authClient.$Infer.Session;

export function useAppSession() {
  const { data } = authClient.useSession();
  return data;
}
```

Barrel re-export (`src/contexts/index.ts`):

```typescript
export { useAppSession } from "./use-app-session";
export type { SessionData } from "./use-app-session";
```

## How it works
- Calls `authClient.useSession()` under the hood.
- Discards `isPending`, `error`, and `refetch` — returns only `data`.
- `data` is `null` when unauthenticated, otherwise matches `SessionData`.

## Why wrap
- **Single import path for consumers** — `import { useAppSession } from '@/contexts'` instead of `import { authClient } from '@/lib/auth-client'` every time.
- **Stable API surface** — if Better Auth's hook signature changes, only this module updates.
- **Intent signaling** — "app session" name documents that this is the authenticated-user session, not a cookie/session-storage primitive.
- **Limitation**: drops `isPending`. Components that must distinguish "loading" from "signed-out" (like `UserProvider`) bypass this hook and call `authClient.useSession()` directly (`src/contexts/user-context.tsx:35`).

## Usage
Consumer pattern (test file `use-app-session.test.ts:17-26`):

```typescript
mockUseSession.mockReturnValue({ data: mockSessionData });
const result = useAppSession();
// result === mockSessionData
```

When a component needs `isPending` too, import `authClient` directly:

```typescript
// src/contexts/user-context.tsx:35
const { data: session, isPending } = authClient.useSession();
```

## Test coverage (`use-app-session.test.ts`)

| Test | Line | Asserts |
|---|---|---|
| returns session data | 17 | `{ data: mockSessionData }` → hook returns `mockSessionData` |
| returns null when no session | 28 | `{ data: null }` → hook returns `null` |

## Gotchas
- Use the wrapper for read-only session access; drop to `authClient.useSession()` when you need `isPending` / `error` / `refetch` (`src/contexts/user-context.tsx:35`).
- The `customSession` plugin only runs server-side; `SessionData.user.userGuid` is present at runtime but may require a type assertion (see pattern in `user-context.tsx:42`).
- Do not import from `@/lib/auth-client` in a feature component purely to read the session — prefer `useAppSession` from `@/contexts` for consistency.

## Related docs
- `user-provider.md` — concrete consumer that destructures `userGuid` from the session
- `../auth/README.md` — Better Auth config + `customSession` plugin that shapes `SessionData`

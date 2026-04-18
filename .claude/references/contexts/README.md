---
title: contexts
type: index
domain: contexts
---

## What's in this domain
Two React client contexts composed at the app shell: `UserProvider` (enriched MP profile, fetched from `userGuid`) and `useAppSession` (thin wrapper around Better Auth's `authClient.useSession()`). `session-context.tsx` is a hook module, not a `Context` — naming is legacy.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `user-provider.md` | `UserProvider`, `useUser`, `MPUserProfile` load lifecycle, error handling | Reading/refreshing the signed-in MP profile from a client component |
| `session.md` | `useAppSession()` wrapper, `SessionData` type, rationale | Accessing the Better Auth session client-side |

## Code surfaces
| Path | Role |
|------|------|
| `src/contexts/user-context.tsx` | `UserProvider` + `useUser` hook (loads `MPUserProfile` from `userGuid`) |
| `src/contexts/user-context.test.tsx` | 5 test cases: throw-outside-provider, load-with-guid, null-session, missing-guid, error path, refresh |
| `src/contexts/session-context.tsx` | `useAppSession()` + `SessionData` type alias |
| `src/contexts/session-context.test.tsx` | 2 test cases: data passthrough, null session |
| `src/contexts/index.ts` | Barrel: `UserProvider`, `useUser`, `useAppSession`, `SessionData` |
| `src/app/providers.tsx` | Client `Providers` — mounts `<UserProvider>` + Sonner `<Toaster>` |

## Related domains
- `../auth/README.md` — `userGuid` comes from Better Auth session (OIDC `sub` mapped via `mapProfileToUser`)
- `../services/README.md` — `UserService.getUserProfile(userGuid)` is the downstream lookup invoked by `getCurrentUserProfile` server action
- `../data-flow/README.md` — component → server action → service call chain

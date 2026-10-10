---
title: contexts
type: index
domain: contexts
---

## What's in this domain
Two React client contexts composed at the app shell: `UserProvider` (enriched MP profile, fetched from `userGuid`) and `useAppSession` (thin wrapper around Better Auth's `authClient.useSession()`). `use-app-session.ts` is a hook module, not a `Context`. Neither `useUser` nor `useAppSession` has a consumer outside `src/contexts/` since the header `UserMenu` was removed (#54); `UserProvider` is still mounted by `src/app/providers.tsx`.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `user-provider.md` | `UserProvider`, `useUser`, `MPUserProfile` load lifecycle, error handling | Reading/refreshing the signed-in MP profile from a client component |
| `session.md` | `useAppSession()` wrapper, `SessionData` type, rationale | Accessing the Better Auth session client-side |

## Code surfaces
| Path | Role |
|------|------|
| `src/contexts/user-context.tsx` | `UserProvider` + `useUser` hook (loads `MPUserProfile` from `userGuid`) |
| `src/contexts/user-context.test.tsx` | 11 test cases: throw-outside-provider, load-with-guid, null-session, missing-guid, error path, refresh, plus refresh-without-guid, pending state, non-Error rejection, undefined profile, error cleared on refresh |
| `src/contexts/use-app-session.ts` | `useAppSession()` + `SessionData` type alias |
| `src/contexts/use-app-session.test.ts` | 2 test cases: data passthrough, null session |
| `src/contexts/index.ts` | Barrel: `UserProvider`, `useUser`, `useAppSession`, `SessionData` |
| `src/app/providers.tsx` | Client `Providers` — mounts `<UserProvider>` + Sonner `<Toaster>` |

## Related domains
- `../auth/README.md` — `userGuid` comes from Better Auth session (OIDC `sub` mapped via `mapProfileToUser`)
- `../services/README.md` — `UserService.getUserProfile(userGuid)` is the downstream lookup invoked by `getCurrentUserProfile` server action
- `../data-flow/README.md` — component → server action → service call chain

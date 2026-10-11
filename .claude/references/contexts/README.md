---
title: contexts
type: index
domain: contexts
---

## What's in this domain
Two React client contexts composed at the app shell: `UserProvider` (enriched MP profile, fetched from `userGuid`) and `useAppSession` (thin wrapper around Better Auth's `authClient.useSession()`). `use-app-session.ts` is a hook module, not a `Context`. Both hooks are kept as a documented **extension point** for tools built on the template — nothing outside `src/contexts/` calls them today (the header `UserMenu` was removed in #54). `UserProvider` is mounted by `src/app/providers.tsx` but fetches **lazily**: it makes no MP call until some component calls `useUser()`, and all consumers share that one load.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `user-provider.md` | `UserProvider`, `useUser`, `MPUserProfile` load lifecycle, error handling | Reading/refreshing the signed-in MP profile from a client component |
| `session.md` | `useAppSession()` wrapper, `SessionData` type, rationale | Accessing the Better Auth session client-side |

## Code surfaces
| Path | Role |
|------|------|
| `src/contexts/user-context.tsx` | `UserProvider` + `useUser` hook (lazily loads `MPUserProfile` from `userGuid` on first `useUser()`) |
| `src/contexts/user-context.test.tsx` | 14 test cases: throw-outside-provider, load-with-guid, null-session, missing-guid, error path, refresh, plus refresh-without-guid, pending state, non-Error rejection, undefined profile, error cleared on refresh, plus lazy fetch (no consumer → no call, two consumers → one call, late consumer triggers the call) |
| `src/contexts/use-app-session.ts` | `useAppSession()` + `SessionData` type alias |
| `src/contexts/use-app-session.test.ts` | 2 test cases: data passthrough, null session |
| `src/contexts/index.ts` | Barrel: `UserProvider`, `useUser`, `useAppSession`, `SessionData` |
| `src/app/providers.tsx` | Client `Providers` — mounts `<UserProvider>` + Sonner `<Toaster>` |

## Related domains
- `../auth/README.md` — `userGuid` comes from Better Auth session (OIDC `sub` mapped via `mapProfileToUser`)
- `../services/README.md` — `UserService.getUserProfile(userGuid)` is the downstream lookup invoked by `getCurrentUserProfile` server action
- `../data-flow/README.md` — component → server action → service call chain

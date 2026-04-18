---
title: auth
type: index
domain: auth
---

## What's in this domain
Better Auth (`^1.5.5`) wired to Ministry Platform OIDC via the `genericOAuth` plugin, with stateless JWT cookie sessions, a `customSession` name-splitter, and dual-layer route protection (proxy + `AuthWrapper`).

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `oauth-flow.md` | `genericOAuth` config, callback URL, `getUserInfo`, `mapProfileToUser`, OIDC `endsession` logout | Wiring the MP OAuth client, debugging callbacks or logout |
| `sessions.md` | Stateless JWT cookie strategy, `cookieCache`, `customSession`, session shape, access patterns | Reading/modifying session data, any `getSession()` call |
| `route-protection.md` | `src/proxy.ts` + `AuthWrapper` dual-layer pattern, `x-pathname` forwarding, `callbackUrl` preservation | Touching route guards or sign-in redirect behavior |
| `user-identity.md` | `session.user.id` (Better Auth internal) vs `session.user.userGuid` (MP `User_GUID`) — gotcha | Before any MP API lookup keyed by the signed-in user |

## Code surfaces
| Path | Role |
|------|------|
| `src/lib/auth.ts` | Server Better Auth config (plugins: `genericOAuth`, `customSession`, `nextCookies`) |
| `src/lib/auth-client.ts` | Client `authClient` (`genericOAuthClient`, `customSessionClient`) |
| `src/app/api/auth/[...all]/route.ts` | Route handler (`toNextJsHandler(auth)`) |
| `src/app/signin/page.tsx` | Sign-in page — auto-redirects via `authClient.signIn.oauth2()` |
| `src/proxy.ts` | Route protection (session-cookie presence check + `x-pathname` forwarding) |
| `src/components/layout/auth-wrapper.tsx` | Server-component guard — redirects to `/signin` with `callbackUrl` |
| `src/components/user-menu/actions.ts` | `handleSignOut()` — OIDC `endsession` redirect |
| `src/contexts/user-context.tsx` | `UserProvider` — loads MP profile client-side from `userGuid` |
| `src/contexts/session-context.tsx` | `useAppSession()` — thin wrapper around `authClient.useSession()` |
| `src/auth.test.ts` | Unit tests for `customSession`, `getUserInfo`, `mapProfileToUser` logic |
| `src/proxy.test.ts` | Proxy route-protection tests |
| `src/components/layout/auth-wrapper.test.tsx` | `AuthWrapper` redirect tests |
| `src/components/user-menu/actions.test.ts` | `handleSignOut` tests |

## Related domains
- `../contexts/README.md` — `UserProvider` consumes `userGuid` from the session
- `../services/README.md` — `UserService.getUserProfile(userGuid)` is the downstream MP lookup
- `../routing/README.md` — Next.js 16 `proxy.ts` (renamed from `middleware.ts`)

---
title: auth
type: index
domain: auth
---

## What's in this domain
Better Auth (`1.7.x`) wired to Ministry Platform OIDC via the `genericOAuth` plugin — explicit endpoints (no boot-time discovery), the id_token verified by the app against lazily loaded discovery + JWKS, a dedicated OIDC client (`MP_OIDC_CLIENT_ID`, falling back to the service account with a warning), and one auth instance per process — with stateless sessions (12 h ceiling, encrypted `session_data` cookie, no user OAuth tokens), boot-time secret/URL refusals, a `customSession` name-splitter, and dual-layer route protection (proxy + `AuthWrapper`).

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `oauth-flow.md` | `genericOAuth` config, lazy id_token verification, `getUserInfo` + sub binding, dedicated OIDC client, log events, `endsession` logout | Wiring the MP OAuth client, debugging callbacks, outages or logout |
| `sessions.md` | Session lifetime, JWE `cookieCache`, no OAuth tokens, boot refusals (`assertAuthEnvironment`, `src/lib/env.ts`), client-IP headers, `customSession`, session shape | Reading/modifying session data, any `getSession()` call |
| `route-protection.md` | `src/proxy.ts` + `AuthWrapper` dual-layer pattern, `x-pathname` forwarding, `callbackUrl` preservation | Touching route guards or sign-in redirect behavior |
| `user-identity.md` | `session.user.id` (Better Auth internal) vs `session.user.userGuid` (MP `User_GUID`) — gotcha | Before any MP API lookup keyed by the signed-in user |

## Code surfaces
| Path | Role |
|------|------|
| `src/lib/auth.ts` | Server Better Auth config (plugins: `genericOAuth`, `customSession`, `nextCookies`) |
| `src/lib/auth-client.ts` | Client `authClient` (`customSessionClient`) |
| `src/lib/env.ts` | `getMpBaseUrl()`, `getAuthBaseUrl()`, `getOidcClient()` — validated env readers |
| `src/app/api/auth/[...all]/route.ts` | Route handler (`toNextJsHandler(auth)`) |
| `src/app/signin/page.tsx` | Sign-in page — auto-redirects via `authClient.signIn.social({ provider: "ministryplatform" })` |
| `src/proxy.ts` | Route protection (session-cookie presence check + `x-pathname` forwarding) |
| `src/components/layout/auth-wrapper.tsx` | Server-component guard — redirects to `/signin` with `callbackUrl` |
| `src/components/user-menu/actions.ts` | `handleSignOut()` — clears the session, then `endsession` with `client_id` (+ `id_token_hint` when this process has it) |
| `src/contexts/user-context.tsx` | `UserProvider` — loads MP profile client-side from `userGuid` |
| `src/contexts/session-context.tsx` | `useAppSession()` — thin wrapper around `authClient.useSession()` |
| `src/auth.test.ts` | Config pins, `customSession`, `mapProfileToUser` |
| `src/auth.user-info.test.ts` | `getUserInfo` with genuinely signed id_tokens (verification, alg confusion, sub binding) |
| `src/auth.oidc-discovery.test.ts` | MP down/hanging at boot and at the callback; lazy verifier units |
| `src/auth.id-token-sign-in.test.ts` / `src/auth.shared-instance.test.ts` | F12 layers / one instance per process |
| `src/test-utils/mock-oidc.ts` | Mock MP OIDC provider (per-endpoint failure modes, `signIdToken`) |
| `src/proxy.test.ts` | Proxy route-protection tests |
| `src/components/layout/auth-wrapper.test.tsx` | `AuthWrapper` redirect tests |
| `src/components/user-menu/actions.test.ts` | `handleSignOut` tests |

## Related domains
- `../contexts/README.md` — `UserProvider` consumes `userGuid` from the session
- `../services/README.md` — `UserService.getUserProfile(userGuid)` is the downstream MP lookup
- `../routing/README.md` — Next.js 16 `proxy.ts` (renamed from `middleware.ts`)

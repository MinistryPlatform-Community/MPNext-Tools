---
title: routing
type: index
domain: routing
---

## What's in this domain
Next.js 16 App Router layout, the `(web)` route group that wraps protected pages with auth, and the `proxy.ts` request gate (renamed from `middleware.ts` in Next.js 16; runs on the Node.js runtime).

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `app-router.md` | Route group `(web)`, nested layouts, dashboard, tool routes, `/no-access`, public `/signin` + `/auth-error`, `/session-error`, `/api/auth/[...all]` | Adding/moving a route, understanding layout nesting |
| `proxy.md` | Next.js 16 `proxy()` function, cookie-only auth check, public path whitelist, `x-pathname` forwarding, CSP nonce | Changing auth gate, adding a new public path |

## Code surfaces
| Path | Role |
|------|------|
| `src/proxy.ts` | Proxy — cookie check + redirect to `/signin`, per-request CSP |
| `src/proxy.test.ts` | Proxy behavior tests |
| `src/app/layout.tsx` | Root HTML shell (`<html><body>`) |
| `src/app/(web)/layout.tsx` | Route-group layout — mounts `AuthWrapper` + `Providers` + fonts |
| `src/app/(web)/tools/layout.tsx` | Tools sub-layout — full-height gray background; UX redirect of role-less users to `/no-access` |
| `src/app/(web)/tools/require-tool-access.ts` | `requireToolAccess()` — page-level enforcement every tool page awaits first |
| `src/app/(web)/page.tsx` | Dashboard (5 tool cards) |
| `src/app/(web)/no-access/page.tsx` | No-security-role explanation + sign-out form |
| `src/app/(web)/error.tsx` | Client error boundary for `(web)` |
| `src/app/error.tsx` / `src/app/global-error.tsx` | Boundaries outside `(web)` / for a root-layout throw |
| `src/app/signin/page.tsx` | Public OAuth sign-in page |
| `src/app/auth-error/page.tsx` | Public OAuth-failure page |
| `src/app/session-error/page.tsx` | Recovery page for a session with no `userGuid` (outside `(web)`) |
| `src/app/api/auth/[...all]/route.ts` | Better Auth catch-all handler behind a deny-by-default allowlist |
| `src/app/providers.tsx` | Client context composition (`UserProvider` + `Toaster`) |
| `src/components/layout/auth-wrapper.tsx` | Server component full session check |

## Dual-layer auth gate
- **Layer 1 — `proxy.ts`** (Node.js runtime): cookie presence only, no API call
- **Layer 2 — `AuthWrapper`** (server component): full `auth.api.getSession()` validation
- See `proxy.md` for rationale

## Related domains
- `../auth/README.md` — Better Auth config, session shape, OAuth flow
- `../contexts/README.md` — `UserProvider`, `useAppSession`
- `../components/README.md` — `AuthWrapper`, layout components

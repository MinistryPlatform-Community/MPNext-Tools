---
title: routing
type: index
domain: routing
---

## What's in this domain
Next.js 16 App Router layout, the `(web)` route group that wraps protected pages with auth, and the `proxy.ts` edge gate (renamed from `middleware.ts` in Next.js 16).

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `app-router.md` | Route group `(web)`, nested layouts, dashboard, tool routes, public `/signin`, `/api/auth/[...all]` | Adding/moving a route, understanding layout nesting |
| `proxy.md` | Next.js 16 `proxy()` function, cookie-only auth check, public path whitelist, `x-pathname` forwarding | Changing auth gate, adding a new public path |

## Code surfaces
| Path | Role |
|------|------|
| `src/proxy.ts` | Edge proxy — cookie check + redirect to `/signin` |
| `src/proxy.test.ts` | Proxy behavior tests |
| `src/app/layout.tsx` | Root HTML shell (`<html><body>`) |
| `src/app/(web)/layout.tsx` | Route-group layout — mounts `AuthWrapper` + `Providers` + fonts |
| `src/app/(web)/tools/layout.tsx` | Tools sub-layout — full-height gray background |
| `src/app/(web)/page.tsx` | Dashboard (5 tool cards) |
| `src/app/(web)/home/page.tsx` | Redirects to `/` via `redirect('/')` |
| `src/app/(web)/error.tsx` | Client error boundary for `(web)` |
| `src/app/signin/page.tsx` | Public OAuth sign-in page |
| `src/app/api/auth/[...all]/route.ts` | Better Auth catch-all handler |
| `src/app/providers.tsx` | Client context composition (`UserProvider` + `Toaster`) |
| `src/components/layout/auth-wrapper.tsx` | Server component full session check |

## Dual-layer auth gate
- **Layer 1 — `proxy.ts`** (edge): cookie presence only, no API call
- **Layer 2 — `AuthWrapper`** (server component): full `auth.api.getSession()` validation
- See `proxy.md` for rationale

## Related domains
- `../auth/README.md` — Better Auth config, session shape, OAuth flow
- `../contexts/README.md` — `UserProvider`, `useAppSession`
- `../components/README.md` — `AuthWrapper`, layout components

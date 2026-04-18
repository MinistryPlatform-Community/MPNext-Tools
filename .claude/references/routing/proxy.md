---
title: Proxy (Next.js 16 edge gate)
domain: routing
type: reference
applies_to: [src/proxy.ts, src/proxy.test.ts, src/components/layout/auth-wrapper.tsx]
symbols: [proxy, config]
related: [app-router.md, ../auth/README.md, ../components/README.md]
last_verified: 2026-04-17
---

## Purpose
Edge-runtime gate that does a cheap cookie-presence check and redirects unauthenticated users to `/signin?callbackUrl=...` before any server component runs. Real session validation happens downstream in `AuthWrapper`.

## Files
- `src/proxy.ts` — `proxy()` function + `config` matcher
- `src/proxy.test.ts` — behavior tests (public paths, redirect, callback URL, error paths, matcher, `x-pathname` forwarding)
- `src/components/layout/auth-wrapper.tsx` — layer-2 full session validation

## Key concepts
- **Next.js 16 rename** — `middleware.ts` → `proxy.ts`, `export function middleware` → `export function proxy`. Same runtime and semantics; rename only. Codemod: `npx @next/codemod@latest middleware-to-proxy .`
- **Cookie-only check at the edge** — uses `getSessionCookie` from `better-auth/cookies`; no DB or API call, no JWT decode
- **Full validation is deferred** to `AuthWrapper` server component — see "Why dual-layer" below
- **Public-path whitelist** — `/api/*` and `/signin` bypass the cookie check
- **`x-pathname` header forwarding** — proxy writes pathname + search onto request headers via `NextResponse.next({ request: { headers } })` so `AuthWrapper` can reconstruct the original URL for `callbackUrl` even on passthroughs
- **Matcher** excludes `_next/static`, `_next/image`, `favicon.ico`, and `assets/`

## API / Interface

`src/proxy.ts` (entire file):
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullPath = pathname + request.nextUrl.search;

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', fullPath);
  const passThrough = () =>
    NextResponse.next({ request: { headers: forwardedHeaders } });

  // Early returns for public paths
  if (pathname.startsWith('/api') || pathname === '/signin') {
    console.log(`Proxy: Allowing public path ${pathname}`);
    return passThrough();
  }

  try {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      console.log("Proxy: Redirecting to signin - no session cookie");
      const signinUrl = new URL('/signin', request.url);
      signinUrl.searchParams.set('callbackUrl', fullPath);
      return NextResponse.redirect(signinUrl);
    }

    console.log(`Proxy: Allowing request to ${pathname}`);
    return passThrough();

  } catch (error) {
    console.error('Proxy: Error checking session:', error);
    const signinUrl = new URL('/signin', request.url);
    signinUrl.searchParams.set('callbackUrl', fullPath);
    return NextResponse.redirect(signinUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};
```

## Public paths (whitelist)
| Path prefix | Reason |
|---|---|
| `/api` (includes `/api/auth/*`) | Better Auth catch-all and any server API must be reachable without a session |
| `/signin` | OAuth sign-in page itself must render unauthenticated |

Anything else requires a session cookie.

## Why dual-layer (proxy + AuthWrapper)
| Layer | Runs in | Check | Cost | Failure mode |
|---|---|---|---|---|
| `proxy()` | Edge runtime, every request | Cookie presence only | ~µs, no I/O | Redirects to `/signin` |
| `AuthWrapper` | Server component (Node), once per page render | `auth.api.getSession()` — full JWT validate + custom session | ms, async | Redirects to `/signin` |

- Edge can't run Node-only Better Auth internals cheaply — cookie check is the fast path
- An attacker with a stale/forged cookie passes the proxy but fails `AuthWrapper`
- `AuthWrapper` also mints `session.user.userGuid` via the custom session plugin — required before any MP API call (see `../auth/README.md`)

## `x-pathname` forwarding
`AuthWrapper` reads this header to build a correct `callbackUrl` when the proxy let the request through but the full session check fails:

`src/components/layout/auth-wrapper.tsx:5-19`:
```typescript
export async function AuthWrapper({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    const originalPath = hdrs.get("x-pathname") || "/";
    const signinUrl = new URL("/signin", "http://placeholder");
    signinUrl.searchParams.set("callbackUrl", originalPath);
    redirect(`${signinUrl.pathname}${signinUrl.search}`);
  }

  return <>{children}</>;
}
```

Only `passThrough()` (which calls `NextResponse.next({ request: { headers } })`) propagates the header. Redirect responses do not — by the time the browser re-requests `/signin`, the pathname is already in `callbackUrl`.

## How it works (flow)
Protected route hit:
1. Browser → `/tools/template?recordID=123`
2. `proxy()` checks matcher → applies
3. Builds `forwardedHeaders` with `x-pathname: /tools/template?recordID=123`
4. Path is not `/api` nor `/signin` → run cookie check
5. `getSessionCookie(request)` → present → `NextResponse.next(...)` with forwarded headers
6. Next.js routes to `(web)/tools/template/page.tsx` — `WebLayout` mounts `AuthWrapper`
7. `AuthWrapper` calls `auth.api.getSession(...)` with forwarded headers → validates
8. If valid → render; if not → `redirect('/signin?callbackUrl=/tools/template?recordID=123')`

## Next.js 16 specifics (verified via context7)
- File must be named `proxy.ts` (or `proxy.js`) at project root or `src/`
- Function export must be named `proxy` (not `middleware`)
- `config` shape unchanged — `{ matcher: [...] }`
- `middleware.js` is **deprecated** in Next.js 16 (docs source: `next.js/docs/01-app/02-guides/upgrading/version-16.mdx`)

## Test coverage (`src/proxy.test.ts`)
- Public paths: `/api/*`, nested `/api/*`, `/signin` — all skip cookie check
- Protected paths: no cookie → redirect to `/signin` with `callbackUrl` (with and without query string)
- Error during `getSessionCookie` → redirect to `/signin` with `callbackUrl`
- `x-pathname` forwarded on public paths and authenticated passthrough
- Matcher config exported correctly (excludes `_next/static`, `_next/image`, `favicon.ico`, `assets/`)

## Gotchas
- **Adding a public route**: must add a branch to the `if (pathname.startsWith('/api') || pathname === '/signin')` check in `src/proxy.ts:18`, otherwise proxy redirects before the page is reachable
- **Expecting full session in proxy**: don't add DB/API calls here — edge runtime and cold-path latency. Use `AuthWrapper` instead
- **Redirect responses don't carry `x-pathname`**: only `NextResponse.next()` forwards the header; don't add logic that expects the header on a redirect response
- **Matcher regex**: any new static directory you don't want gated must be added to the exclusion group (currently `_next/static`, `_next/image`, `favicon.ico`, `assets/`)
- **Edge runtime**: proxy runs on the edge; Node-only APIs unavailable

## Related docs
- `app-router.md` — route tree, `(web)` group, where `AuthWrapper` mounts
- `../auth/README.md` — Better Auth config, `getSessionCookie`, session shape
- `../components/README.md` — `AuthWrapper` component details

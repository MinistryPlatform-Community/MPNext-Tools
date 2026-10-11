---
title: Proxy (Next.js 16 request gate)
domain: routing
type: reference
applies_to: [src/proxy.ts, src/proxy.test.ts, src/lib/security-headers.ts, src/components/layout/auth-wrapper.tsx]
symbols: [proxy, config, isPublicPath]
related: [app-router.md, ../auth/README.md, ../components/README.md]
last_verified: 2026-10-10
---

## Purpose
Request gate in front of every page: a cheap cookie-presence check that redirects unauthenticated users to `/signin?callbackUrl=...` before any server component runs, plus the per-request CSP nonce. Real session validation happens downstream in `AuthWrapper`.

## Files
- `src/proxy.ts` — `proxy()` function + `config` matcher
- `src/proxy.test.ts` — behavior tests (public paths, redirect, callback URL, error paths, matcher anchoring, `x-pathname` forwarding, CSP)
- `src/lib/security-headers.ts` — `buildCsp`, `generateNonce`, `cspHeaderName`, `cspReportUri`, `reportingEndpointsHeader`
- `src/components/layout/auth-wrapper.tsx` — layer-2 full session validation

## Key concepts
- **Next.js 16 rename** — `middleware.ts` → `proxy.ts`, `export function middleware` → `export function proxy`. Codemod: `npx @next/codemod@latest middleware-to-proxy .`
- **Runtime is Node.js, not edge** — in Next.js 16 `proxy` always runs on the `nodejs` runtime and the `runtime` config option cannot be set (edge is only available by staying on the deprecated `middleware`)
- **Cookie-only check** — uses `getSessionCookie` from `better-auth/cookies`; no MP/API call, no cookie decryption
- **Full validation is deferred** to `AuthWrapper` server component — see "Why dual-layer" below
- **Public-path whitelist** (`isPublicPath`) — exactly `/api/auth`, `/api/auth/*`, `/signin` and `/auth-error` bypass the cookie check. Every other `/api/*` route is gated
- **`x-pathname` header forwarding** — proxy writes pathname + search onto request headers via `NextResponse.next({ request: { headers } })` so `AuthWrapper` can reconstruct the original URL for `callbackUrl` even on passthroughs
- **CSP + nonce** — a fresh nonce per request; the policy is set on the **request** headers (Next reads the nonce from there at render time) and on every **response**, redirects included. `x-nonce` is also forwarded. See `../security/README.md`
- **Matcher** excludes `_next/static/`, `_next/image`, `favicon.ico` and `assets/` — each exclusion anchored, so `/favicon.ico-admin` or `/_next/imagery` is still gated

## API / Interface

`src/proxy.ts` (abridged — CSP construction elided):
```typescript
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/api/auth' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/signin' ||
    pathname === '/auth-error'
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullPath = pathname + request.nextUrl.search;
  // ...nonce + CSP built here...
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', fullPath);
  forwardedHeaders.set('x-nonce', nonce);
  forwardedHeaders.set(headerName, csp);

  const passThrough = () =>
    withCsp(NextResponse.next({ request: { headers: forwardedHeaders } }));
  const redirectToSignin = () => { /* /signin?callbackUrl=<fullPath>, withCsp */ };

  if (isPublicPath(pathname)) return passThrough();

  try {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) return redirectToSignin();
    return passThrough();
  } catch (error) {
    // Identifier/shape only — never the request path or query string.
    console.error('proxy.session_check_failed', { message: /* error.message */ });
    return redirectToSignin();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static/|_next/image$|favicon\\.ico$|assets/).*)',
  ],
};
```

## Public paths (whitelist)
| Path | Reason |
|---|---|
| `/api/auth`, `/api/auth/*` | Better Auth catch-all — itself deny-by-default (allowlist in `src/app/api/auth/[...all]/route.ts`). Exact segment match, so `/api/authz` is **not** public |
| `/signin` | OAuth sign-in page itself must render unauthenticated |
| `/auth-error` | OAuth callback failures land here with no session; gating it would bounce to `/signin`, which auto-restarts OAuth — an infinite loop |

Anything else — including any other `/api/*` route and `/session-error` — requires a session cookie.

## Why dual-layer (proxy + AuthWrapper)
| Layer | Runs in | Check | Cost | Failure mode |
|---|---|---|---|---|
| `proxy()` | Node.js runtime, every matched request | Cookie presence only | ~µs, no I/O | Redirects to `/signin` |
| `AuthWrapper` | Server component, once per page render | `auth.api.getSession()` — decrypts/validates the JWE session cookie + `customSession` | ms, async | No session → `/signin`; session without `userGuid` → `/session-error` |

- The proxy runs on every matched request (pages, RSC fetches, server-action POSTs), so it stays a cheap cookie check; the full check runs where the page renders
- An attacker with a stale/forged cookie passes the proxy but fails `AuthWrapper`
- `AuthWrapper` also mints `session.user.userGuid` via the custom session plugin — required before any MP API call (see `../auth/README.md`)

## `x-pathname` forwarding
`AuthWrapper` reads this header to build a correct `callbackUrl` when the proxy let the request through but the full session check fails:

`src/components/layout/auth-wrapper.tsx:5-31` (comments trimmed):
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

  const userGuid = (session.user as { userGuid?: string | null }).userGuid;
  if (!userGuid) {
    redirect("/session-error");
  }

  return <>{children}</>;
}
```

Only `passThrough()` (which calls `NextResponse.next({ request: { headers } })`) propagates `x-pathname`. Redirect responses do not — by the time the browser re-requests `/signin`, the pathname is already in `callbackUrl`.

## How it works (flow)
Protected route hit:
1. Browser → `/tools/template?recordID=123`
2. `proxy()` checks matcher → applies
3. Builds `forwardedHeaders` with `x-pathname: /tools/template?recordID=123`
4. Path is not public (`isPublicPath`) → run cookie check
5. `getSessionCookie(request)` → present → `NextResponse.next(...)` with forwarded headers
6. Next.js routes to `(web)/tools/template/page.tsx` — `WebLayout` mounts `AuthWrapper`
7. `AuthWrapper` calls `auth.api.getSession(...)` with forwarded headers → validates
8. If valid → render; if not → `redirect('/signin?callbackUrl=/tools/template?recordID=123')` (or `/session-error` when the session has no `userGuid`)

## Next.js 16 specifics
- File must be named `proxy.ts` (or `proxy.js`) at project root or `src/`
- Function export must be named `proxy` (not `middleware`)
- `config` shape unchanged — `{ matcher: [...] }`
- `middleware` is **deprecated** in Next.js 16; `proxy` runs on `nodejs` only and setting `runtime` throws (source: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, `.../03-api-reference/03-file-conventions/proxy.md`)

## Test coverage (`src/proxy.test.ts`)
- Public paths: `/api/auth`, nested `/api/auth/*`, `/signin`, `/auth-error` skip the cookie check; `/api/other` is gated
- Protected paths: no cookie → redirect to `/signin` with `callbackUrl` (with and without query string)
- Error during `getSessionCookie` → redirect to `/signin` with `callbackUrl`
- `x-pathname` forwarded on public paths and authenticated passthrough, not on redirects
- Matcher: exempt paths skipped; prefix look-alikes (`/favicon.ico-admin`, `/_next/imagery`, `/assets-admin`, …) still matched
- CSP: set on request and response with the same per-request nonce, on redirects too; `CSP_REPORT_URI` → `Reporting-Endpoints`

## Gotchas
- **Adding a public route**: must add it to `isPublicPath()` in `src/proxy.ts`, otherwise proxy redirects before the page is reachable. Use exact or segment-anchored matches, never a bare `startsWith` prefix
- **Expecting full session in proxy**: don't add MP/API calls here — it runs on every matched request. Use `AuthWrapper` instead
- **Redirect responses don't carry `x-pathname`**: only `NextResponse.next()` forwards the header; don't add logic that expects the header on a redirect response
- **Matcher regex**: any new static directory you don't want gated must be added to the exclusion group (currently `_next/static/`, `_next/image`, `favicon.ico`, `assets/`), anchored like the existing entries — an excluded path also gets no CSP header

## Related docs
- `app-router.md` — route tree, `(web)` group, where `AuthWrapper` mounts
- `../auth/README.md` — Better Auth config, `getSessionCookie`, session shape
- `../components/README.md` — `AuthWrapper` component details

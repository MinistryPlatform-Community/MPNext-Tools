---
title: Route Protection (proxy + AuthWrapper)
domain: auth
type: reference
applies_to: [src/proxy.ts, src/components/layout/auth-wrapper.tsx, src/app/(web)/layout.tsx]
symbols: [proxy, config, isPublicPath, AuthWrapper]
related: [sessions.md, oauth-flow.md, ../routing/proxy.md]
last_verified: 2026-10-10
---

## Purpose
Dual-layer route protection: a cookie presence check in `src/proxy.ts` (Next.js 16 proxy, formerly middleware), plus a server-component `AuthWrapper` that verifies the decoded session and preserves the original URL as `callbackUrl` through the OAuth round-trip.

## Files
- `src/proxy.ts` — proxy function (exported as `proxy`, not `middleware`) + matcher
- `src/proxy.test.ts` — proxy route-protection tests
- `src/components/layout/auth-wrapper.tsx` — server-component guard used by `(web)` layout
- `src/components/layout/auth-wrapper.test.tsx` — `AuthWrapper` redirect/callbackUrl tests
- `src/app/(web)/layout.tsx` — mounts `<AuthWrapper>` around authenticated pages
- `src/app/session-error/page.tsx` — recovery page for broken (no-`userGuid`) sessions; **outside** `(web)`
- `src/app/(web)/no-access/page.tsx` — where `ToolsLayout` sends signed-in users with no MP security role; has a sign-out form

## Key concepts
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** and `middleware()` → `proxy()`. The matcher is still exported as `config`.
- **Layer 1 (proxy):** `getSessionCookie()` from `better-auth/cookies` — **cookie-presence check only**, no cookie decryption, no DB (there's no DB). Runs on the Node.js runtime (Next 16 `proxy` cannot run on edge).
- **Layer 2 (`AuthWrapper`):** `auth.api.getSession({ headers })` in a server component — decodes the cookie, validates session, redirects to `/signin` with `callbackUrl` if invalid/missing. It **also** redirects a session that exists but has no `userGuid` to `/session-error` (see "Broken-session recovery" below).
- **`x-pathname` forwarding:** proxy copies `pathname + search` into a request header. `AuthWrapper` reads it via `headers()` to build an accurate `callbackUrl` even when the proxy itself lets the request through (valid cookie, decoded session invalid).
- **Public paths (proxy bypass):** `/api/auth` + `/api/auth/*` (Better Auth endpoints — every other `/api/*` is gated), `/signin` and `/auth-error`. Static (`_next/static/`, `_next/image`, `favicon.ico`, `assets/`) are excluded via the anchored matcher.

## Proxy function (`src/proxy.ts`)

The full annotated source (abridged, CSP construction elided) lives in
[`../routing/proxy.md`](../routing/proxy.md#api--interface). The gate itself:

```typescript
// src/proxy.ts
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/api/auth' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/signin' ||
    pathname === '/auth-error'
  );
}

// inside proxy():
if (isPublicPath(pathname)) return passThrough();   // x-pathname + CSP forwarded
const sessionCookie = getSessionCookie(request);    // try/catch → redirectToSignin()
if (!sessionCookie) return redirectToSignin();      // /signin?callbackUrl=<path+search>
return passThrough();

export const config = {
  matcher: [
    '/((?!_next/static/|_next/image$|favicon\\.ico$|assets/).*)',
  ],
};
```

## AuthWrapper (verbatim, `src/components/layout/auth-wrapper.tsx`)

```typescript
// src/components/layout/auth-wrapper.tsx
export async function AuthWrapper({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    // Preserve the originally requested URL (pathname + search) so the
    // user lands back on the exact tool + params they asked for after
    // completing OAuth. The proxy forwards this via x-pathname.
    const originalPath = hdrs.get("x-pathname") || "/";
    const signinUrl = new URL("/signin", "http://placeholder");
    signinUrl.searchParams.set("callbackUrl", originalPath);
    redirect(`${signinUrl.pathname}${signinUrl.search}`);
  }

  // A session without a userGuid is unusable: every MP lookup keys off userGuid.
  // Route these broken sessions to a recovery page that CAN sign them out.
  const userGuid = (session.user as { userGuid?: string | null }).userGuid;
  if (!userGuid) {
    redirect("/session-error");
  }

  return <>{children}</>;
}
```

Mounted via:

```typescript
// src/app/(web)/layout.tsx:34-42 (inside WebLayout)
<AuthWrapper>
  <Providers>
    <div className={...}>
      <main className="flex-1">
        {children}
      </main>
    </div>
  </Providers>
</AuthWrapper>
```

## Path matrix

| Path pattern | Proxy behavior | AuthWrapper behavior |
|---|---|---|
| `/api/auth`, `/api/auth/*` | pass through (public; route itself is allowlisted) | not mounted (no `(web)` layout) |
| other `/api/*` | redirect to `/signin` if no cookie | not mounted |
| `/signin`, `/auth-error` | pass through (public) | not mounted |
| `/session-error` | pass through if cookie present; else → `/signin` | not mounted (outside `(web)`) — no redirect loop |
| `/_next/static/*`, `/_next/image`, `/favicon.ico`, `/assets/*` | excluded by matcher | not mounted |
| `/`, `/no-access`, `/tools/...` | redirect to `/signin?callbackUrl=<path>` if no cookie | `/signin` if session missing; `/session-error` if session present but no `userGuid` |

## `callbackUrl` preservation end-to-end

1. User hits `/tools/addresslabels?s=123&pageID=456`.
2. Proxy: no cookie → 302 to `/signin?callbackUrl=/tools/addresslabels?s=123&pageID=456`.
3. `/signin` page reads `callbackUrl` from `searchParams`, **sanitizes it** (`sanitizeCallbackUrl` — it must be a path on this origin, never `//host` or `/\host`), then calls `authClient.signIn.social({ provider: "ministryplatform", callbackURL })`.
4. After OIDC round-trip → `/api/auth/callback/ministryplatform` → Better Auth redirects browser to `callbackURL`.
5. Request for `/tools/addresslabels?s=123&pageID=456` now has a session cookie; proxy passes through with `x-pathname` set.
6. `AuthWrapper` confirms decoded session — if ever absent, falls back to `/signin?callbackUrl=<x-pathname value or "/">`.

Tested:
- `src/proxy.test.ts:150-159` — proxy attaches `callbackUrl` with query string preserved
- `src/components/layout/auth-wrapper.test.tsx:51-94` — `AuthWrapper` reads `x-pathname`, falls back to `/`, URL-encodes the query

## Broken-session recovery (`/session-error`)

A session can be authenticated (cookie present, `getSession()` returns a user)
yet have **no `userGuid`** — e.g. after a better-auth upgrade drops the field
(see `user-identity.md`), or a user row created before the field existed. Such a
session is a trap: every MP lookup keys off `userGuid`, so nothing works — and
the app has no sign-out control in its shell (the only ones are the forms on
`/session-error` and `/no-access`), so the user would be stuck.

`AuthWrapper` defends against this independent of root cause: a session with no
`userGuid` → `redirect("/session-error")`. The page (`src/app/session-error/page.tsx`)
renders a recovery screen with a `handleSignOut` form button, giving the user an
unconditional exit.

Why this placement:
- **Not the proxy:** it does a cookie-*presence* check and never decrypts the
  JWE `session_data` cookie, so it can't cheaply see `userGuid`.
- **Not cookie deletion in the wrapper:** Next.js forbids cookie mutation during
  a Server Component render (only actions/route handlers) — which is exactly why
  recovery uses a server-action form button, not an auto-clear.
- **`/session-error` is outside the `(web)` route group,** so it is not wrapped
  by `AuthWrapper` and cannot redirect-loop. The proxy lets it through whenever a
  (broken but present) session cookie exists.

Tested: `src/components/layout/auth-wrapper.test.tsx` — no session → `/signin`,
session without `userGuid` → `/session-error`, `userGuid: null` → `/session-error`,
healthy session → renders children.

## Gotchas
- **Next.js 16 rename:** anything that refers to `middleware.ts` or `middleware()` is stale. This project uses `proxy.ts` / `proxy()`.
- **Proxy is a cookie-presence check only.** A forged/expired/invalid cookie will pass the proxy and only be caught by `AuthWrapper`. This is by design (it runs on every matched request), but it means route guards **must** rely on `AuthWrapper` (or equivalent `auth.api.getSession()` check) for correctness — never the proxy alone.
- **`/api/auth/*` is public at the proxy layer.** The route is a deny-by-default allowlist in front of Better Auth's handler. Any other `/api/*` route is cookie-gated by the proxy, but its handler must still authorize (`AuthorizationService`) — see `../security/README.md`.
- **`x-pathname` forwarding:** proxy only forwards it via `NextResponse.next({ request: { headers: forwardedHeaders } })`. When the proxy redirects, the header is not used — `AuthWrapper` only sees it on pass-through requests (`src/proxy.test.ts:230-238`).
- **Trailing-slash fallback:** if `x-pathname` is missing (e.g., request didn't route through the proxy), `AuthWrapper` falls back to `"/"` (`src/components/layout/auth-wrapper.tsx:13`).

## Related docs
- `sessions.md` — what the cookie contains and how `getSession` decodes it
- `oauth-flow.md` — `callbackURL` handling on the OIDC round-trip
- `../routing/README.md` — Next.js 16 `proxy.ts` convention

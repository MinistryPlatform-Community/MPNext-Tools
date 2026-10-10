import { NextResponse, NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import {
  buildCsp,
  cspHeaderName,
  cspReportUri,
  generateNonce,
  reportingEndpointsHeader,
} from '@/lib/security-headers';

/**
 * Paths reachable without a session.
 *
 * `/auth-error` MUST be here. Better Auth redirects OAuth callback failures to
 * it (see `onAPIError` in `src/lib/auth.ts`), and the visitor has no session at
 * that point by definition. Without this entry they would bounce to `/signin`,
 * which immediately auto-starts OAuth again — looping forever on the exact
 * failure the page exists to explain.
 *
 * Only the Better Auth catch-all (`/api/auth/*`) is intentionally
 * unauthenticated among API routes — and it is itself deny-by-default; see the
 * allowlist in `src/app/api/auth/[...all]/route.ts`. Any other `/api/*` route
 * goes through the session-cookie check below so handlers don't have to
 * re-implement auth on their own.
 */
function isPublicPath(pathname: string): boolean {
  return (
    // Exact segment match: a bare `startsWith('/api/auth')` would also make a
    // future `/api/authz` or `/api/auth-admin` route public by accident.
    pathname === '/api/auth' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/signin' ||
    pathname === '/auth-error'
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullPath = pathname + request.nextUrl.search;

  const isDev = process.env.NODE_ENV !== 'production';
  const headerName = cspHeaderName();
  const nonce = generateNonce();
  const reportUri = cspReportUri(process.env.CSP_REPORT_URI, isDev);
  const reportingEndpoints = reportingEndpointsHeader(reportUri);
  const csp = buildCsp({
    nonce,
    isDev,
    reportOnly: headerName === 'Content-Security-Policy-Report-Only',
    reportUri,
  });

  // Forward the original URL (pathname + search) to downstream server
  // components via a request header, so AuthWrapper (and anything else
  // that needs to redirect to /signin) can build a correct callbackUrl
  // even when the proxy itself lets the request through.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', fullPath);

  // Next.js does NOT accept the nonce as an argument — it re-reads it off the
  // INCOMING REQUEST HEADERS during render (see `app-render.js`, which reads
  // `content-security-policy` or `content-security-policy-report-only`). So the
  // policy has to be set on the request as well as the response; setting only
  // the response leaves every script tag unnonced and the policy matching
  // nothing on the page.
  forwardedHeaders.set('x-nonce', nonce);
  forwardedHeaders.set(headerName, csp);

  const withCsp = (response: NextResponse) => {
    response.headers.set(headerName, csp);
    if (reportingEndpoints) {
      response.headers.set('Reporting-Endpoints', reportingEndpoints);
    }
    return response;
  };

  const passThrough = () =>
    withCsp(NextResponse.next({ request: { headers: forwardedHeaders } }));

  const redirectToSignin = () => {
    const signinUrl = new URL('/signin', request.url);
    signinUrl.searchParams.set('callbackUrl', fullPath);
    return withCsp(NextResponse.redirect(signinUrl));
  };

  if (isPublicPath(pathname)) {
    return passThrough();
  }

  try {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      return redirectToSignin();
    }

    return passThrough();

  } catch (error) {
    // Identifier/shape only — never the request path or query string.
    console.error('proxy.session_check_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return redirectToSignin();
  }
}

/**
 * Every path except Next's static chunks, the image endpoint, the favicon and
 * `public/assets/`. Each exclusion is ANCHORED — to a trailing `/` for the
 * directories and to end-of-path (`$`) for the two single files — so a page
 * named `/favicon.ico-admin` or `/_next/imagery` cannot slip past the session
 * check and the CSP by sharing a prefix with an exempt path. The `.` in
 * `favicon.ico` is escaped for the same reason.
 */
export const config = {
  matcher: [
    '/((?!_next/static/|_next/image$|favicon\\.ico$|assets/).*)',
  ],
};

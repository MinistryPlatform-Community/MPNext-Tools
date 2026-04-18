import { NextResponse, NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullPath = pathname + request.nextUrl.search;

  // Forward the original URL (pathname + search) to downstream server
  // components via a request header, so AuthWrapper (and anything else
  // that needs to redirect to /signin) can build a correct callbackUrl
  // even when the proxy itself lets the request through.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', fullPath);
  const passThrough = () =>
    NextResponse.next({ request: { headers: forwardedHeaders } });

  // Early returns for public paths. Only the Better Auth catch-all
  // (`/api/auth/*`) is intentionally unauthenticated — any other `/api/*`
  // route must go through the session-cookie check below so handlers
  // don't have to re-implement auth on their own.
  if (pathname.startsWith('/api/auth') || pathname === '/signin') {
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

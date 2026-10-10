import { handleSignOut } from "@/components/shared-actions/sign-out";

/**
 * Recovery page for authenticated-but-unusable sessions.
 *
 * AuthWrapper redirects here when a session exists but has no `userGuid`. Such a
 * session can't load an MP profile, so no tool can serve it. This page gives the
 * user an unconditional way out via `handleSignOut`. It lives outside the (web) route
 * group, so it is NOT wrapped by AuthWrapper and cannot cause a redirect loop.
 */
/**
 * Render per request, like /signin.
 *
 * The nonce-based CSP is built per request (see `src/lib/security-headers.ts`)
 * and Next reads it off the incoming request headers at render time — a
 * prerendered page has no request, therefore no nonce, therefore a blocked
 * bootstrap script and no hydration. The sign-out form below is this user's
 * ONLY escape hatch from an unusable session, so it must not depend on
 * progressive-enhancement fallbacks to work.
 *
 * This file is deliberately NOT a client module: route segment config is
 * silently ignored in one.
 */
export const dynamic = "force-dynamic";

export default function SessionErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">
          We couldn&apos;t load your account
        </h1>
        <p className="text-gray-600 mb-6">
          Your sign-in completed, but it didn&apos;t include the Ministry Platform
          user link we need to load your profile. Please sign out and sign in
          again. If this keeps happening, contact your administrator.
        </p>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-[#344767] px-5 py-2.5 text-white font-medium hover:bg-[#2d3a5f] focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Sign out and try again
          </button>
        </form>
      </div>
    </div>
  );
}

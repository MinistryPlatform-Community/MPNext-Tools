import type { NextConfig } from "next";

/**
 * Request-independent security headers.
 *
 * These live here rather than in `src/proxy.ts` for one reason: the proxy's
 * matcher deliberately skips `_next/static`, `_next/image`, `favicon.ico` and
 * `assets/`, and these headers should still reach those responses (and `/api`).
 * The Content-Security-Policy is the exception and lives in the proxy, because
 * its nonce must be regenerated per request — see `src/lib/security-headers.ts`.
 *
 * Anti-framing is expressed TWICE on purpose: `X-Frame-Options` here covers the
 * routes the proxy skips, and `frame-ancestors` in the CSP covers the rest.
 * They are not both CSP headers — two `Content-Security-Policy` headers on one
 * response are enforced as an INTERSECTION, which is miserable to debug.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

/**
 * HSTS is production-only — sending it from a dev server pins localhost to
 * HTTPS in the developer's browser, which is painful to undo.
 *
 * Deliberately NO `preload`: that is a one-way submission to a browser-vendor
 * list, and it is the deploying church's decision, not a repo default.
 */
const hstsHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains",
};

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which made the address-label mail merge's documented
      // template limit unreachable. 4 MB stays under Vercel's 4.5 MB function
      // request-body cap so Next rejects first, with a clear error. Sized
      // with the limits in `src/components/address-labels/limits.ts` — change
      // them together.
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers:
          process.env.NODE_ENV === "production"
            ? [...securityHeaders, hstsHeader]
            : securityHeaders,
      },
    ];
  },
};

export default nextConfig;

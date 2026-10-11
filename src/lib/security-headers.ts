/**
 * Content Security Policy construction.
 *
 * WHY: the Better Auth session cookie is the only credential this app holds,
 * and every page renders strings that came out of Ministry Platform. A script
 * injection anywhere is therefore an immediate session-theft path. This is the
 * defence-in-depth layer underneath the authorization and endpoint work.
 *
 * WHY HERE AND NOT `next.config.ts`: the nonce must be fresh per request. A
 * build-time value is a constant an attacker can read off any page, which
 * defeats the point. The request-independent headers (X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS) DO live in
 * `next.config.ts`, because that also covers `/api` and the static paths the
 * proxy matcher skips.
 */

/**
 * Returns the response header name to use.
 *
 * ENFORCES BY DEFAULT. Only the exact string "false" drops to report-only, so a
 * typo or a missing variable fails LOUD (a too-strict header) rather than
 * SILENT (no policy at all). Report-only is the unusual state you switch on to
 * diagnose a violation, not a state a deploy can drift into by forgetting to
 * set something.
 */
export function cspHeaderName(
  enforce: boolean = process.env.CSP_ENFORCE !== "false",
): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return enforce
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}

/** Loopback hosts allowed over plain http, and only in development. */
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Parses a configured URL, accepting only `https:` (or `http:` to a loopback
 * host in development). Anything else — `http:` to a real host, `javascript:`,
 * `data:`, a credentialed URL, garbage — is null, so a bad env value drops the
 * source from the policy instead of widening it. `new URL()` alone would
 * happily turn `data:,x` into the origin `"null"`, and an `http:` origin would
 * let a network attacker serve the "trusted" images.
 */
function safeUrl(value: string | undefined, isDev: boolean): URL | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const loopbackHttp =
    isDev && url.protocol === "http:" && LOOPBACK_HOSTNAMES.has(url.hostname);
  if (url.protocol !== "https:" && !loopbackHttp) return null;
  if (url.username || url.password) return null;
  return url;
}

/** Reduces a configured URL to a bare scheme+host origin, or null. */
function originOf(value: string | undefined, isDev: boolean): string | null {
  return safeUrl(value, isDev)?.origin ?? null;
}

/** The `report-to` group name, shared by the CSP and `Reporting-Endpoints`. */
const REPORT_GROUP = "csp-endpoint";

/**
 * The validated CSP report collector (`CSP_REPORT_URI`), or null when unset or
 * not a safe URL. Reporting is OPT-IN: this repo ships no collector, so each
 * deployment points it at one it owns (Sentry, report-uri.com, ...).
 *
 * Characters that would break out of a header value or a directive (`;`, `,`,
 * `"`, whitespace) are refused rather than escaped — a legitimate collector URL
 * never needs them.
 */
export function cspReportUri(
  value: string | undefined = process.env.CSP_REPORT_URI,
  isDev: boolean = false,
): string | null {
  const url = safeUrl(value, isDev);
  if (!url) return null;
  const href = url.href;
  return /[\s;,"]/.test(href) ? null : href;
}

/**
 * The `Reporting-Endpoints` header value that `report-to` resolves against, or
 * null when reporting is off. Sent alongside the CSP by the proxy.
 */
export function reportingEndpointsHeader(reportUri: string | null): string | null {
  return reportUri ? `${REPORT_GROUP}="${reportUri}"` : null;
}

export interface CspOptions {
  nonce: string;
  isDev?: boolean;
  /** When true, omit `upgrade-insecure-requests` (see below). */
  reportOnly?: boolean;
  mpBaseUrl?: string;
  mpFileUrl?: string;
  /** Validated collector URL (see `cspReportUri`); null/omitted = no reporting. */
  reportUri?: string | null;
}

/**
 * Builds the CSP header value.
 *
 * Three directives are deliberately looser than they look like they should be.
 * Do NOT "tighten" them back into an outage:
 *
 * 1. `style-src 'unsafe-inline'`, WITH NO NONCE. Radix's dialog pulls in
 *    react-remove-scroll, which locks body scroll by INJECTING A `<style>`
 *    ELEMENT at runtime. That is an element, not an attribute, so
 *    `style-src-attr` never applies and it falls through to `style-src` — where
 *    a nonce cannot help, because the element is created by script long after
 *    the server chose the nonce. A hash does not work either: the content
 *    embeds the computed scrollbar width, so it varies by platform and zoom.
 *    Critically, the nonce MUST stay out of this directive — CSP3 browsers
 *    ignore `'unsafe-inline'` whenever a nonce sits beside it, which is exactly
 *    the trap that produces a policy that looks correct and breaks every
 *    dialog. The cost is bounded: inline STYLE injection permits limited
 *    selector-based exfiltration, not script execution. `script-src` keeps its
 *    nonce and `strict-dynamic`, which is the control that actually matters.
 *
 * 2. `form-action` includes the MP origin. Sign-out is a form-driven server
 *    action that ends in a redirect to MP's endsession endpoint, and browsers
 *    apply `form-action` to the WHOLE REDIRECT CHAIN, not just its first hop.
 *
 * 3. `img-src` includes the MP file origin, for contact photos served straight
 *    from Ministry Platform.
 *
 * `upgrade-insecure-requests` is omitted in dev AND whenever the policy is
 * report-only: browsers refuse to honour it in a report-only policy and log an
 * error saying so on every page, which buries the reports that report-only
 * exists to surface.
 */
export function buildCsp({
  nonce,
  isDev = false,
  reportOnly = false,
  mpBaseUrl = process.env.MINISTRY_PLATFORM_BASE_URL,
  mpFileUrl = process.env.NEXT_PUBLIC_MINISTRY_PLATFORM_FILE_URL,
  reportUri = null,
}: CspOptions): string {
  const mpOrigin = originOf(mpBaseUrl, isDev);
  const fileOrigin = originOf(mpFileUrl, isDev);

  const imgSources = ["'self'", "data:", "blob:", mpOrigin, fileOrigin].filter(
    (v, i, a): v is string => Boolean(v) && a.indexOf(v) === i,
  );

  const formActions = ["'self'", mpOrigin].filter(
    (v, i, a): v is string => Boolean(v) && a.indexOf(v) === i,
  );

  const directives: string[] = [
    `default-src 'self'`,
    // 'strict-dynamic' lets a nonced script load its own chunks (Next does this
    // constantly) without whitelisting origins.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSources.join(" ")}`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `frame-src 'none'`,
    // 'none', not 'self': nothing here emits a <base> tag, and 'self' would
    // still let an injected <base href="/x/"> silently re-root every relative
    // URL on the page.
    `base-uri 'none'`,
    `form-action ${formActions.join(" ")}`,
    `frame-ancestors 'none'`,
  ];

  if (!isDev && !reportOnly) {
    directives.push("upgrade-insecure-requests");
  }

  // Both spellings: `report-to` (with the `Reporting-Endpoints` header) is the
  // current standard; `report-uri` is what Firefox still honours, and browsers
  // that support `report-to` ignore `report-uri` when both are present.
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`, `report-to ${REPORT_GROUP}`);
  }

  return directives.join("; ");
}

/**
 * Generates a fresh per-request nonce.
 *
 * Base64 of 16 random bytes — matches the charset Next's
 * `getScriptNonceFromHeader` accepts (`[A-Za-z0-9+/_-]+={0,2}`).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

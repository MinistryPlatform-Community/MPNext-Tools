/**
 * Validated readers for the two auth-critical URLs (and, at the end of the
 * file, the app's MP OAuth client).
 *
 * `MINISTRY_PLATFORM_BASE_URL` is the trust anchor for everything the app says
 * to Ministry Platform: the client-secret POST, every bearer API call, the
 * userinfo call carrying the user's access token, OIDC discovery (loaded lazily
 * at the first sign-in callback; it names the issuer and the JWKS that
 * id_tokens are verified against) and the end-session redirect.
 * `BETTER_AUTH_URL` is better-auth's `baseURL`: the OAuth `redirect_uri`, the
 * trusted origin for `callbackURL`, and (via its scheme) whether cookies are
 * `Secure`. Unvalidated, an `http://` value sent secrets in cleartext, a
 * trailing slash produced `//oauth`, an unset MP URL silently became
 * `undefined/oauth/...`, and an unset `BETTER_AUTH_URL` made better-auth derive
 * the base URL from the request's Host header (redirect_uri poisoning).
 *
 * Both readers throw on a bad value and never echo it: a URL can carry
 * credentials (`https://user:pass@host`), and error messages end up in logs.
 * They take the env as an argument (defaulting to `process.env`) so they can be
 * unit tested without re-importing anything.
 */

type Env = Readonly<Record<string, string | undefined>>;

/** Loopback hosts allowed over plain http (see `loopbackHttpInProduction`). */
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isProduction(env: Env): boolean {
  return env.NODE_ENV === "production";
}

/**
 * Parses `raw` and applies the checks both URLs share. `name` is the variable
 * name used in error messages; the value itself is never included.
 */
function parseAuthCriticalUrl(
  name: string,
  raw: string | undefined,
  env: Env,
  { loopbackHttpInProduction = false }: { loopbackHttpInProduction?: boolean } = {},
): URL {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`[env] ${name} is not set.`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[env] ${name} is not a valid absolute URL.`);
  }
  const loopbackAllowed = loopbackHttpInProduction || !isProduction(env);
  const loopbackHttp =
    url.protocol === "http:" && LOOPBACK_HOSTNAMES.has(url.hostname) && loopbackAllowed;
  if (url.protocol !== "https:" && !loopbackHttp) {
    throw new Error(
      loopbackAllowed
        ? `[env] ${name} must use https:// (http:// is allowed only for localhost / 127.0.0.1${loopbackHttpInProduction ? "" : " outside production"}).`
        : `[env] ${name} must use https:// in production.`,
    );
  }
  if (url.username || url.password) {
    throw new Error(`[env] ${name} must not contain credentials.`);
  }
  // `new URL("https://x?")` parses to an empty `search`, so check the raw
  // string too: a stray `?` or `#` means the value is not what was intended.
  if (url.search || url.hash || value.includes("?") || value.includes("#")) {
    throw new Error(`[env] ${name} must not contain a query string or fragment.`);
  }
  return url;
}

/**
 * The Ministry Platform API base URL, e.g.
 * `https://my.church.org/ministryplatformapi`, with no trailing slash, so
 * callers can append `/oauth/...` or `/tables/...` directly.
 *
 * A path IS allowed here (MP's API lives under `/ministryplatformapi`), unlike
 * `getAuthBaseUrl`. `https:` is required; `http://localhost` / `127.0.0.1`
 * are accepted only when `NODE_ENV !== "production"`, for a local mock.
 */
export function getMpBaseUrl(env: Env = process.env): string {
  const url = parseAuthCriticalUrl("MINISTRY_PLATFORM_BASE_URL", env.MINISTRY_PLATFORM_BASE_URL, env);
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/**
 * The app's own origin (`BETTER_AUTH_URL`, falling back to `NEXTAUTH_URL`),
 * e.g. `https://app.church.org`. Required: without it better-auth trusts the
 * request's Host header. Origin only — better-auth appends `/api/auth` itself,
 * and the value is also the exact `post_logout_redirect_uri` registered in MP,
 * so a path is refused rather than silently dropped (a single trailing `/` is
 * tolerated). `https:` is required for every real host, in every environment.
 * `http://localhost` / `127.0.0.1` / `[::1]` is accepted even when
 * `NODE_ENV=production`, so `next build` / `next start` work locally and in CI
 * with the default `.env.local`: a loopback origin never leaves the machine,
 * and better-auth leaves cookies non-`Secure` only for such an http origin.
 * (The MP URL stays strict — it carries the client secret.)
 */
export function getAuthBaseUrl(env: Env = process.env): string {
  const name = env.BETTER_AUTH_URL?.trim() ? "BETTER_AUTH_URL" : "NEXTAUTH_URL";
  const raw = env.BETTER_AUTH_URL?.trim() ? env.BETTER_AUTH_URL : env.NEXTAUTH_URL;
  if (!raw?.trim()) {
    throw new Error("[env] BETTER_AUTH_URL is not set (NEXTAUTH_URL is accepted as a fallback).");
  }
  const url = parseAuthCriticalUrl(name, raw, env, { loopbackHttpInProduction: true });
  if (url.pathname !== "/") {
    throw new Error(`[env] ${name} must be an origin only (no path), e.g. https://app.example.org.`);
  }
  return url.origin;
}

/** The app's MP OAuth client. See `getMpClient`. */
export interface MpClient {
  clientId: string;
  clientSecret: string;
}

/**
 * The app's single MP OAuth client (`MINISTRY_PLATFORM_CLIENT_ID` /
 * `MINISTRY_PLATFORM_CLIENT_SECRET`). It is both the client-credentials
 * service account every MP data call uses AND the client user sign-in (OIDC)
 * runs as, so its id is also the id_token audience and the sign-out
 * `client_id`.
 *
 * One client by owner decision (2026-10-10): a single registration and a
 * single secret per deployment. The consequence to keep in mind is that this
 * one secret is both full MP data access and user sign-in, so its MP client
 * record must carry the sign-in redirect URIs
 * (`<BETTER_AUTH_URL>/api/auth/callback/ministryplatform`, post-logout
 * `<BETTER_AUTH_URL>`) and nothing broader.
 *
 * Throws when either value is unset and never echoes a value.
 */
export function getMpClient(env: Env = process.env): MpClient {
  const clientId = env.MINISTRY_PLATFORM_CLIENT_ID?.trim();
  const clientSecret = env.MINISTRY_PLATFORM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "[env] MINISTRY_PLATFORM_CLIENT_ID and MINISTRY_PLATFORM_CLIENT_SECRET must both be set (the app's MP OAuth client).",
    );
  }
  return { clientId, clientSecret };
}

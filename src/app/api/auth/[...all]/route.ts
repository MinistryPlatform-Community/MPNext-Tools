import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Deny-by-default allowlist for the Better Auth catch-all.
 *
 * `toNextJsHandler(auth)` mounts every endpoint Better Auth defines — roughly
 * thirty of them, including `/get-access-token`, `/refresh-token`,
 * `/list-accounts`, `/link-social`, `/unlink-account`, `/account-info`,
 * `/list-sessions`, `/revoke-*`, `/sign-up/email`, `/sign-in/email`,
 * `/update-user`, `/update-session` and `/ok` — plus anything a future
 * Better Auth release adds. This app's browser client calls exactly three.
 *
 * These paths were read off the installed version, not assumed — and they
 * CHANGED in Better Auth 1.7. The genericOAuth plugin no longer mounts
 * endpoints of its own; it now registers its providers as first-class SOCIAL
 * providers, so sign-in goes through the CORE `POST /sign-in/social` and
 * `GET /callback/:id` endpoints. On 1.6 these were `POST /sign-in/oauth2` and
 * `GET /oauth2/callback/:providerId`, and `/oauth2/link` existed as the
 * plugin's account-linking endpoint; none of those exist any more.
 *
 * Re-enumerate this list against the installed version on every Better Auth
 * upgrade. A stale entry fails CLOSED — sign-in 404s loudly — which is the
 * behaviour to want, but it is still an outage.
 *
 * `/sign-out` is deliberately absent too: sign-out runs server-side through
 * `auth.api.signOut` in `src/components/user-menu/actions.ts`, which calls the
 * handler directly and never crosses this HTTP boundary. If a future change
 * moves sign-out to `authClient.signOut()` in the browser, it will 404 here —
 * loudly, which is the point.
 */
export const allowedAuthRoutes = {
  GET: ["/get-session", "/callback/ministryplatform"],
  POST: ["/sign-in/social"],
} as const;

const AUTH_PREFIX = "/api/auth";

/**
 * Normalizes a request URL to a path relative to `/api/auth`, for exact
 * comparison against the allowlist.
 *
 * Exported for testing. Exact string matching only — no regex, no prefix
 * matching — so that a path cannot be widened by a crafted suffix.
 */
export function authRoutePath(url: string): string {
  const { pathname } = new URL(url);
  const relative = pathname.startsWith(AUTH_PREFIX)
    ? pathname.slice(AUTH_PREFIX.length)
    : pathname;
  // Collapse trailing slashes so "/get-session/" cannot slip past the match.
  const trimmed = relative.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isAllowedAuthRoute(
  method: keyof typeof allowedAuthRoutes,
  url: string,
): boolean {
  const path = authRoutePath(url);
  return (allowedAuthRoutes[method] as readonly string[]).includes(path);
}

/**
 * The only body keys `POST /sign-in/social` may carry (F12, route layer).
 *
 * The browser client sends exactly these two —
 * `authClient.signIn.social({ provider, callbackURL })` in
 * `src/app/signin/sign-in-content.tsx`, which better-auth's client proxy
 * forwards as the JSON body verbatim.
 *
 * better-auth's body schema accepts far more: `idToken` (the direct sign-in
 * mode behind the token-substitution account takeover — see
 * `refuseIdTokenSignIn` in `src/lib/auth.ts`), plus `scopes`, `loginHint`,
 * `additionalParams`, `errorCallbackURL`, `newUserCallbackURL`,
 * `additionalData`, `requestSignUp` and `disableRedirect`, each of which lets
 * a caller reshape the authorize request or the post-login redirects. None is
 * used here, so all are closed. Allowlisted, not denylisted: a key a future
 * better-auth version adds is refused until deliberately opened here. Never
 * add `idToken`.
 */
export const allowedSignInSocialKeys = ["provider", "callbackURL"] as const;

/**
 * The one provider `/sign-in/social` may name. Must equal `providerId` in
 * `src/lib/auth.ts` — no hyphen; it is part of the redirect URI registered
 * with Ministry Platform.
 */
export const SIGN_IN_SOCIAL_PROVIDER = "ministryplatform";

/**
 * Largest `POST /sign-in/social` body this route will read, in bytes. The real
 * client sends a few hundred bytes at most, and under ~2.1 KB even at the
 * `callbackURL` cap. Without a cap, one anonymous request with a
 * multi-megabyte RELATIVE `callbackURL` passes better-auth's
 * `isSafeRelativeURL`, is copied into the OAuth state, and comes back as a
 * Set-Cookie roughly twice its size — and this filter runs BEFORE
 * better-auth's rate limiter.
 */
export const MAX_SIGN_IN_SOCIAL_BODY_BYTES = 4096;

/** Longest `callbackURL` accepted (UTF-16 code units, i.e. `String.length`). */
export const MAX_CALLBACK_URL_LENGTH = 2048;

/**
 * The only Content-Type accepted, tested against the RAW header value.
 *
 * better-call (`getBody`) uses its JSON parser only when the untrimmed header
 * matches the anchored `/^application\/([a-z0-9.+-]*\+)?json/i`; anything else
 * falls through to SUBSTRING matches for form, multipart, text and
 * octet-stream. A filter that JSON-parsed a body better-call then parses some
 * other way would inspect different keys than better-auth acts on. Anything
 * this regex accepts starts with `application/json`, so better-call's JSON
 * parser is the one that runs, on the same bytes this filter reads.
 *
 * Deliberately NOT `trim()`med first: JS `trim()` strips U+00A0 (NBSP), which
 * HTTP does not treat as whitespace, so a trimmed check would accept
 * `<NBSP>application/json` — which better-call does not parse as JSON.
 */
const JSON_CONTENT_TYPE = /^application\/json[\t ]*(;|$)/i;

/**
 * Reads a body stream with a hard byte cap. Returns `null` (and stops reading)
 * as soon as more than `limit` bytes arrive, so a chunked body with no
 * Content-Length — or one that lies about it — is never buffered past the cap.
 */
async function readBodyWithLimit(
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      // Do NOT `await reader.cancel()`. This is a `clone()` (a tee branch),
      // and a tee branch's cancel promise settles only once BOTH branches are
      // cancelled — the original never is on this path, so awaiting it hangs
      // the request. Releasing the lock is enough.
      reader.releaseLock();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Body filter for `POST /sign-in/social` — defence in depth behind
 * `refuseIdTokenSignIn` (the primary control, which also covers in-process
 * `auth.api.signInSocial` calls this route never sees).
 *
 * Exported for testing. All of these must hold, or the request gets the same
 * plain 404 as a non-allowlisted path, so a caller learns nothing about which
 * check tripped:
 *
 * - Content-Type matches `JSON_CONTENT_TYPE` and contains no `,`. The comma
 *   rule is belt and braces: a repeated header (which `Headers.get` joins with
 *   ", ") is refused because the real client never sends one.
 * - A declared Content-Length, if present, is all digits and within
 *   `MAX_SIGN_IN_SOCIAL_BODY_BYTES`; the clone is then read with the same hard
 *   cap, because a chunked body carries no length.
 * - The bytes decode (`new TextDecoder()` — BOM stripped, bad sequences
 *   replaced, exactly as `request.json()` does) and `JSON.parse` to a plain
 *   object whose keys are a subset of `allowedSignInSocialKeys`.
 * - `provider === SIGN_IN_SOCIAL_PROVIDER`.
 * - `callbackURL`, if present, is a string of at most `MAX_CALLBACK_URL_LENGTH`.
 *
 * Reads a `clone()` so the original body stream is still intact for
 * better-auth.
 */
export async function isAllowedSignInSocialBody(request: Request): Promise<boolean> {
  const contentType = request.headers.get("content-type");
  if (contentType === null || contentType.includes(",")) return false;
  if (!JSON_CONTENT_TYPE.test(contentType)) return false;
  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) ||
      Number(contentLength) > MAX_SIGN_IN_SOCIAL_BODY_BYTES)
  ) {
    return false;
  }
  const stream = request.clone().body;
  if (stream === null) return false;
  let body: unknown;
  try {
    const bytes = await readBodyWithLimit(stream, MAX_SIGN_IN_SOCIAL_BODY_BYTES);
    if (bytes === null) return false;
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return false;
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }
  const allowedKeys: readonly string[] = allowedSignInSocialKeys;
  if (!Object.keys(body).every((key) => allowedKeys.includes(key))) {
    return false;
  }
  const { provider, callbackURL } = body as {
    provider?: unknown;
    callbackURL?: unknown;
  };
  if (
    "callbackURL" in body &&
    (typeof callbackURL !== "string" ||
      callbackURL.length > MAX_CALLBACK_URL_LENGTH)
  ) {
    return false;
  }
  return provider === SIGN_IN_SOCIAL_PROVIDER;
}

/**
 * Marks a response from this route as uncacheable.
 *
 * Every response here is session-bearing or about the session: the OAuth
 * callback's 302 sets the session cookies, `/get-session` returns the user,
 * and `/sign-in/social` sets the state cookie. better-auth sets `no-store` on
 * some of these but not all, so it is set here, on EVERY return path, 404s
 * included.
 *
 * Set in place where possible. A response whose headers are immutable (e.g.
 * one built with `Response.redirect()`) throws on `set`, so it is copied —
 * status, headers (Set-Cookie included) and body stream — first.
 *
 * Exported for testing.
 */
export function withNoStore(response: Response): Response {
  try {
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    const copy = new Response(response.body, response);
    copy.headers.set("Cache-Control", "no-store");
    return copy;
  }
}

/**
 * Plain 404 — never reaches Better Auth, so a disallowed endpoint (or a
 * refused `/sign-in/social` body) is indistinguishable from one that does not
 * exist.
 */
function notFound(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

const handlers = toNextJsHandler(auth);

function guard(
  method: keyof typeof allowedAuthRoutes,
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    if (!isAllowedAuthRoute(method, request.url)) {
      return notFound();
    }
    if (
      method === "POST" &&
      authRoutePath(request.url) === "/sign-in/social" &&
      !(await isAllowedSignInSocialBody(request))
    ) {
      return notFound();
    }
    return withNoStore(await handler(request));
  };
}

export const GET = guard("GET", handlers.GET);
export const POST = guard("POST", handlers.POST);

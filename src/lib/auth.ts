import { betterAuth, BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  genericOAuth,
  type GenericOAuthConfig,
  type GenericOAuthUserInfo,
} from "better-auth/plugins";
import { customSession } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { isIP } from "node:net";
import { getAuthBaseUrl, getMpBaseUrl } from "@/lib/env";
import { validateGuid } from "@/lib/validation";

/**
 * better-auth's built-in fallback secret (`DEFAULT_SECRET`,
 * node_modules/better-auth/dist/utils/constants.mjs — not exported, so it is
 * pinned here; `src/auth.secret-guard.test.ts` reads the library file to catch
 * drift). It is public, so a session signed with it can be forged by anyone.
 */
export const BETTER_AUTH_DEFAULT_SECRET = "better-auth-secret-12345678901234567890";
export const MIN_AUTH_SECRET_LENGTH = 32;

/** Mirrors better-auth's `toBoolean` (@better-auth/core env-impl), which `isTest()` uses on `TEST`. */
function isTruthyEnvFlag(value: string | undefined): boolean {
  return value ? value !== "false" : false;
}

/**
 * Refuses to boot on an auth configuration that would make sessions forgeable
 * or silently switch off better-auth's own safety checks. Throws; never puts
 * the secret in the message.
 *
 * Why this exists instead of relying on better-auth's `validateSecret`
 * (node_modules/better-auth/dist/context/create-context.mjs, 1.7.6):
 * - With no secret set, better-auth falls back to its PUBLIC default secret and
 *   only throws for it when `NODE_ENV === "production"`. On a dev/demo box
 *   (which in the MP world usually talks to the production MP) it boots
 *   silently. In stateless mode the signed cookie is the only authority, so a
 *   known secret lets anyone mint a session for any `userGuid`.
 * - A secret shorter than 32 characters only produces a warning.
 * - `isTest()` is `NODE_ENV === "test" || toBoolean(env.TEST)`. Any truthy
 *   `TEST` on a production process skips secret validation entirely and (were
 *   `advanced.disableOriginCheck` not pinned below) the Origin/callbackURL
 *   checks too.
 * - `BETTER_AUTH_SECRETS` (versioned secrets) silently takes precedence over
 *   the `secret` option, so a guard on `BETTER_AUTH_SECRET` would be checking
 *   a key that is not the one in use. This app does not use versioned
 *   secrets; refuse the variable rather than half-validate it.
 *
 * Exported and pure (takes the env as an argument) so it can be tested without
 * re-importing the module; the module-level call below is what enforces it.
 */
export function assertAuthEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): void {
  const secret = env.BETTER_AUTH_SECRET || env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[auth] BETTER_AUTH_SECRET is not set (NEXTAUTH_SECRET is accepted as a fallback). Refusing to start: better-auth would sign sessions with its public default secret. Generate one with `openssl rand -base64 32`.",
    );
  }
  if (secret === BETTER_AUTH_DEFAULT_SECRET) {
    throw new Error(
      "[auth] BETTER_AUTH_SECRET is better-auth's public default secret. Refusing to start: anyone could forge a session. Generate one with `openssl rand -base64 32`.",
    );
  }
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `[auth] BETTER_AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters. Refusing to start. Generate one with \`openssl rand -base64 32\`.`,
    );
  }
  if (env.BETTER_AUTH_SECRETS) {
    throw new Error(
      "[auth] BETTER_AUTH_SECRETS is set, but this app signs with BETTER_AUTH_SECRET and does not support versioned secrets. Refusing to start: better-auth would silently prefer BETTER_AUTH_SECRETS over the validated secret. Unset it.",
    );
  }
  if (env.NODE_ENV === "production" && isTruthyEnvFlag(env.TEST)) {
    throw new Error(
      "[auth] TEST is set on a production process. Refusing to start: better-auth treats a truthy TEST as a test run and skips its secret validation. Unset TEST.",
    );
  }
}

// Enforced at module load in every environment (development, production, or
// NODE_ENV unset — including `next build`, which imports this module while
// collecting page data). Vitest is the only exemption, detected by the
// `VITEST` env var Vitest itself sets, so individual tests can stub the
// environment and build auth instances; `src/auth.secret-guard.test.ts`
// clears `VITEST` to prove this call really runs on import.
if (!process.env.VITEST) {
  assertAuthEnvironment(process.env);
}

// The two auth-critical URLs, validated once at module load (see
// src/lib/env.ts): https (loopback http outside production only for MP), no
// credentials, query or fragment, no trailing slash, and BETTER_AUTH_URL an
// origin. Unlike the secret guard these run under Vitest too; `test-setup.ts`
// stubs valid values. An unset BETTER_AUTH_URL is refused rather than left to
// better-auth, which would otherwise derive the base URL — and so the OAuth
// redirect_uri and the trusted origins — from the request's Host header.
const mpBaseUrl = getMpBaseUrl();
const authBaseUrl = getAuthBaseUrl();

/**
 * Default client-IP headers, used only when the process runs on Vercel
 * (`VERCEL` is set) and `AUTH_IP_ADDRESS_HEADERS` is not.
 *
 * Vercel's edge sets and overwrites `x-forwarded-for`, `x-vercel-forwarded-for`
 * and `x-real-ip` with the single public client IP and does not forward a
 * client-supplied value (https://vercel.com/docs/headers/request-headers,
 * checked 2026-09-30). `x-vercel-forwarded-for` comes first because it is the
 * one that survives a proxy placed IN FRONT of Vercel, which may overwrite
 * `x-forwarded-for`.
 *
 * Off Vercel these are just request headers any client can send, so they are
 * NOT a safe default there: with the variable unset on another host,
 * better-auth's own default (a single-value `x-forwarded-for`) applies.
 */
export const VERCEL_IP_ADDRESS_HEADERS = ["x-vercel-forwarded-for", "x-real-ip"];

/**
 * Client-IP resolution for better-auth's rate limiter (`/sign-in*` is limited
 * per IP in production). better-auth's default trusts only a single, valid IP
 * in `x-forwarded-for`; anything else — no header, an appended chain, Azure's
 * `ip:port` — drops every client into ONE shared bucket, so a handful of
 * requests blocks sign-in for everyone. Which header is trustworthy depends on
 * the host, so it is configuration, not code:
 *
 * - `AUTH_IP_ADDRESS_HEADERS` — comma-separated header names, tried in order
 *   (e.g. `cf-connecting-ip` behind Cloudflare). Only name a header your edge
 *   always OVERWRITES; a header clients can set themselves lets them rotate
 *   past the limit or lock a victim's IP out. Unset: `VERCEL_IP_ADDRESS_HEADERS`
 *   on Vercel, better-auth's default elsewhere.
 * - `AUTH_TRUSTED_PROXIES` — comma-separated proxy IPs/CIDRs. The forwarded
 *   chain is walked right to left past these, and the first untrusted hop is
 *   the client (for proxies that append to `x-forwarded-for`).
 *
 * Invalid entries refuse startup: better-auth itself only warns and ignores a
 * bad trusted-proxy entry, which would silently fall back to the shared
 * bucket. Per-host guidance is in `.env.example`. Exported for tests.
 */
export function parseIpAddressOptions(
  env: Readonly<Record<string, string | undefined>>,
): { ipAddressHeaders?: string[]; trustedProxies?: string[] } {
  const list = (value: string | undefined) =>
    (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);

  const configured = list(env.AUTH_IP_ADDRESS_HEADERS).map((h) => h.toLowerCase());
  const badHeaders = configured.filter((h) => !/^[a-z0-9-]+$/.test(h));
  if (badHeaders.length > 0) {
    throw new Error(
      `[auth] AUTH_IP_ADDRESS_HEADERS has invalid header names: ${badHeaders.join(", ")}. Use comma-separated names like "cf-connecting-ip".`,
    );
  }
  const ipAddressHeaders =
    configured.length > 0 ? configured : env.VERCEL ? [...VERCEL_IP_ADDRESS_HEADERS] : [];

  const trustedProxies = list(env.AUTH_TRUSTED_PROXIES);
  const badProxies = trustedProxies.filter((entry) => !isIpOrCidr(entry));
  if (badProxies.length > 0) {
    throw new Error(
      `[auth] AUTH_TRUSTED_PROXIES has entries that are not an IP address or CIDR range: ${badProxies.join(", ")}.`,
    );
  }

  return {
    ...(ipAddressHeaders.length > 0 && { ipAddressHeaders }),
    ...(trustedProxies.length > 0 && { trustedProxies }),
  };
}

function isIpOrCidr(entry: string): boolean {
  const slash = entry.indexOf("/");
  const family = isIP(slash === -1 ? entry : entry.slice(0, slash));
  if (family === 0) return false;
  if (slash === -1) return true;
  const prefix = entry.slice(slash + 1);
  return /^\d{1,3}$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128);
}

/**
 * Reserved TLD (RFC 2606) used to build a synthetic, guaranteed-unique email
 * address for every Better Auth user record.
 *
 * Ministry Platform enforces NO uniqueness on email addresses — households
 * routinely share one address across several contacts, each of whom may hold a
 * `dp_Users` login. Better Auth, however, still falls back to email as an
 * identity key: `handleOAuthUserInfo` first looks up the provider account key
 * (`findAccountOwnerByKey`), and when no account matches — which is every FIRST
 * sign-in for a given `sub` — it falls back to
 * `findUserByEmail(userInfo.email.toLowerCase())` and may link the new provider
 * account onto that existing user. See
 * `node_modules/better-auth/dist/oauth2/link-account.mjs`.
 *
 * Keying on a shared address therefore lets the second person to sign in land
 * on the FIRST person's user record — inheriting their `userGuid`, and with it
 * their MP roles and their `User_ID` on every audited write.
 *
 * (Better Auth 1.7 moved the account-key lookup ahead of the email lookup,
 * which narrows the window, but the email fallback is still there and still
 * reachable on a first sign-in. This fix is load-bearing, not redundant.)
 *
 * The only identifier MP guarantees to be unique is the OIDC `sub` (the MP
 * `User_GUID`), so that is what we key on. The real address is preserved
 * separately as `mpEmail` for display.
 *
 * Side benefit: MP does not require a user to have an email address at all.
 * Because Better Auth hard-fails the callback with `email_is_missing` when the
 * profile yields no address, such users previously could not sign in.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "mp.invalid";

/**
 * Builds the synthetic address Better Auth stores in its `email` column.
 * Lower-cased because Better Auth lower-cases the email on both the lookup and
 * the write, and we want our value to round-trip unchanged.
 */
export function syntheticEmailForSub(sub: string): string {
  return `${sub.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Better Auth endpoints that must never be reachable over HTTP.
 *
 * `/update-user` is the important one. Better Auth mounts it unconditionally —
 * it is NOT gated on having email/password sign-in enabled — and its body
 * schema is `z.record(z.string(), z.any())`. It rejects only `email`; every
 * other key is handed to `parseUserInput`, which copies any additional field
 * declared `input !== false` through VERBATIM AND WITH NO VALIDATOR, then
 * re-mints the session cookie from the result. Its only gate is
 * `sessionMiddleware`, which any valid session cookie satisfies.
 *
 * Because `userGuid` must stay `input: true` (see `userAdditionalFields`), the
 * two facts compose into a full identity takeover: any authenticated user could
 * POST themselves a different MP `User_GUID` and inherit that user's MP roles
 * on every authorization check and their `User_ID` on every write.
 *
 * Being stateless is not a mitigation — the handler falls back to
 * `{ ...session.user, ...additionalFields }` when the adapter returns nothing,
 * so the forged value still reaches the cookie.
 *
 * `disabledPaths` is matched in the router's `onRequest`, BEFORE rate limiting,
 * plugins and `sessionMiddleware`, so these 404 for authenticated and anonymous
 * callers alike. The deny-by-default allowlist in
 * `src/app/api/auth/[...all]/route.ts` is the primary control; this is defence
 * in depth for anything that reaches the handler by another route.
 */
export const disabledAuthPaths = [
  "/update-user",
  "/change-email",
  "/change-password",
  "/set-password",
  "/delete-user",
  "/delete-user/callback",
  // `/link-social` has its own id_token branch — a second route to the
  // token-substitution takeover `refuseIdTokenSignIn` closes on
  // `/sign-in/social`. It needs a session and is already outside the route
  // allowlist, but this app never links accounts, so close it outright rather
  // than rely on the allowlist alone.
  "/link-social",
];

/**
 * Error code for a refused id_token sign-in (F12). Exported so tests can
 * assert on it; it is what distinguishes this refusal from better-auth's own
 * `ID_TOKEN_NOT_SUPPORTED` in logs.
 */
export const ID_TOKEN_SIGN_IN_DISABLED = "ID_TOKEN_SIGN_IN_DISABLED";

/**
 * F12 — closes the id_token branch of `POST /sign-in/social`. This is the
 * PRIMARY control for the token-substitution account takeover reported
 * upstream on 2026-09-25.
 *
 * better-auth 1.7's `/sign-in/social` has two modes. Without `idToken` it
 * starts the normal authorization-code redirect — the only mode this app uses.
 * With `idToken: { token, accessToken }` it signs the caller in DIRECTLY: no
 * `state`, no code, no exchange. It verifies the id_token (signature, iss,
 * aud) and then calls our `getUserInfo` with the CALLER-SUPPLIED
 * `accessToken` (`node_modules/better-auth/dist/api/routes/sign-in.mjs`).
 *
 * Because `ministryPlatformProviderConfig` sets `discoveryUrl`, genericOAuth
 * builds an id_token config for the provider, which switches that mode ON
 * (`supportsIdTokenSignIn`) — and genericOAuth has no option to turn it off.
 * Nothing binds the verified id_token's `sub` to the access token's userinfo
 * `sub`, so an attacker's own valid id_token plus ANY other user's MP access
 * token (from any MP client `/connect/userinfo` accepts) would mint a session
 * as that other user: their roles on every authorization check, their
 * `User_ID` on every write.
 *
 * `hooks.before` runs for HTTP requests AND in-process `auth.api.*` calls, so
 * this covers callers the route filter in `src/app/api/auth/[...all]/route.ts`
 * never sees. It keys on the key's PRESENCE (`"idToken" in body`), not its
 * truthiness, so `idToken: null` / `idToken: {}` cannot slip past.
 *
 * 404 (NOT_FOUND), not 400, deliberately: from outside, this mode simply does
 * not exist here — matching the route's deny posture and better-auth's own
 * `ID_TOKEN_NOT_SUPPORTED` (also 404).
 *
 * Defence in depth: the route filter refuses any body key but `provider` and
 * `callbackURL`. The remaining layer — binding `id_token.sub` to userinfo
 * `sub` inside `getUserInfo` — is NOT here yet; it lands with the OIDC
 * lazy-discovery rewrite (security Step 4). Until then this hook and the
 * route filter are what close the path. `src/auth.id-token-sign-in.test.ts`
 * proves each independently.
 */
export const refuseIdTokenSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-in/social") return;
  const body: unknown = ctx.body;
  if (typeof body === "object" && body !== null && "idToken" in body) {
    throw APIError.from("NOT_FOUND", {
      message: "id_token sign-in is disabled",
      code: ID_TOKEN_SIGN_IN_DISABLED,
    });
  }
});

/**
 * Custom fields added to the Better Auth `user` record.
 *
 * BOTH fields MUST keep `input: true`. They are populated server-side from the
 * OAuth profile via `mapProfileToUser`, and as of better-auth 1.6
 * `parseAdditionalUserInputFromProviderProfile` strips any additional field
 * declared `input: false` BEFORE the user record is created — so `input: false`
 * silently drops the value, which breaks every MP profile lookup (avatar, user
 * menu, User_ID resolution). `src/auth.test.ts` guards this.
 *
 * `input: true` also means these fields are writable through Better Auth's
 * `/update-user` endpoint. That endpoint is closed at the route layer (see
 * `disabledAuthPaths` above and the allowlist in the catch-all route) — that
 * is the control, not this flag. Do not "fix" this by flipping the flag; no
 * value of `input` satisfies both requirements, and a field-level
 * `validator.input` runs on the provider-profile path too, so it can constrain
 * the GUID's shape but cannot tell `mapProfileToUser` from an attacker sending
 * a well-formed GUID.
 *
 * `userGuid` is `required: true` so `parseInputData` refuses to create a user
 * record with no MP identity — a session that cannot be tied back to a
 * `dp_Users` row is useless and must fail closed rather than exist.
 */
export const userAdditionalFields = {
  userGuid: {
    type: "string" as const,
    required: true,
    input: true,
  },
  mpEmail: {
    type: "string" as const,
    required: false,
    input: true,
  },
};

/**
 * Extracts a usable MP `User_GUID` from an OIDC userinfo payload, or `null`.
 *
 * Exported for testing. Validates the shape because `sub` is the value every
 * downstream MP lookup keys on — `UserService.getUserProfile` already runs it
 * through `validateGuid`, so an unparseable `sub` would otherwise surface as a
 * mystery failure on the first MP call instead of a clean refusal at sign-in.
 */
export function extractUserGuid(profile: unknown): string | null {
  const sub = (profile as { sub?: unknown } | null | undefined)?.sub;
  if (typeof sub !== "string" || sub.length === 0) return null;
  try {
    return validateGuid(sub).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Builds the display name from the OIDC profile.
 *
 * Better Auth hard-fails the OAuth callback with `name_is_missing` when the
 * resolved name is empty, so this must always return a non-empty string. The
 * previous template-literal form produced the string "undefined undefined"
 * whenever MP omitted the name claims, which satisfied that check by accident
 * while rendering as literal "undefined undefined" in the user menu.
 */
export function buildDisplayName(profile: unknown, fallbackEmail: string | null): string {
  const p = (profile ?? {}) as Record<string, unknown>;
  const part = (v: unknown) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

  const fromClaims = [part(p.given_name), part(p.family_name)]
    .filter((v): v is string => v !== null)
    .join(" ");
  if (fromClaims) return fromClaims;

  const fullName = part(p.name);
  if (fullName) return fullName;

  const localPart = fallbackEmail?.split("@")[0];
  if (localPart) return localPart;

  return "Ministry Platform User";
}

/**
 * Ministry Platform OAuth provider configuration.
 *
 * Exported so `src/auth.test.ts` can pin the flags whose failure mode is a
 * SILENT broken sign-in rather than a type error — `pkce` and
 * `disableIdTokenNonceBinding` in particular.
 */
export const ministryPlatformProviderConfig: GenericOAuthConfig = {
  providerId: "ministryplatform",
  discoveryUrl: `${mpBaseUrl}/oauth/.well-known/openid-configuration`,
  clientId: process.env.MINISTRY_PLATFORM_CLIENT_ID!,
  clientSecret: process.env.MINISTRY_PLATFORM_CLIENT_SECRET!,
  /**
   * No `offline_access`: this app never uses the user's own MP tokens (all MP
   * data access goes through the client-credentials service account), so it
   * has no business asking MP for a long-lived, full-scope refresh token for
   * every signed-in user. `src/auth.user-oauth-tokens.test.ts` guards it.
   */
  scopes: [
    "openid",
    "http://www.thinkministry.com/dataplatform/scopes/all",
  ],
  /**
   * PKCE is OFF, deliberately and permanently.
   *
   * DO NOT "fix" this by reading the discovery document. MP advertises
   * `code_challenge_methods_supported: ["plain", "S256"]` at
   * `/oauth/.well-known/openid-configuration`, but it does not honour the
   * verifier at the token endpoint: with `pkce: true` the authorize leg
   * succeeds and returns a code, then the exchange fails with `invalid_grant`
   * (HTTP 400) and the user lands on `/auth-error?error=invalid_code`.
   *
   * That failure shape is what makes this trap expensive — the advertised
   * support and the accepted `code_challenge` on the authorize URL both look
   * like confirmation, and the flow only breaks on the last hop. Verified
   * against a live MP tenant on 2026-09-13.
   *
   * Without PKCE the authorization code rests on the client secret and the
   * OAuth `state` cookie check. This is a confidential client, so that is the
   * posture this app has always had.
   */
  pkce: false,
  /**
   * Ministry Platform does not echo the `nonce` claim in the
   * authorization-code flow.
   *
   * As of Better Auth 1.7, any provider configured with `discoveryUrl`
   * that publishes a JWKS binds the id_token to the authorization
   * request BY DEFAULT: it sends a server-generated `nonce` and rejects
   * a callback whose id_token does not echo it (OIDC Core 1.0
   * §3.1.3.7). MP omits the claim, so every sign-in would fail with
   * `unable_to_get_user_info`.
   *
   * What this gives up is binding the id_token to this particular
   * authorization request. Signature, issuer and audience are still
   * verified against MP's JWKS, and the residual replay risk is
   * mitigated by the OAuth `state` cookie check, by this being a
   * confidential client exchanging the code with a client secret, and
   * by PKCE above.
   *
   * Watch out when debugging: this failure looks intermittent but is
   * inverted from the obvious reading — sign-in succeeds only when the
   * boot-time discovery fetch FAILED, because that leaves the id_token
   * config undefined and skips verification entirely. A working
   * discovery means a broken sign-in.
   */
  disableIdTokenNonceBinding: true,
  /**
   * Refuse to register the provider if discovery yields no usable `issuer` +
   * `jwks_uri`, instead of silently skipping id_token verification.
   *
   * Without this, a discovery document missing either field leaves the
   * id_token config undefined and the normal flow's id_token goes UNVERIFIED
   * — exactly the "working discovery breaks sign-in, broken discovery works"
   * inversion described above, in its dangerous direction. With it, genericOAuth
   * logs and skips the provider (sign-in 404s `PROVIDER_NOT_FOUND`): an outage,
   * not a silent downgrade. MP's document publishes both (checked against
   * `mpi.ministryplatform.com` on 2026-09-30).
   */
  requireIdTokenVerification: true,
  authorizationUrlParams: {
    realm: "realm",
  },
  /**
   * The stable provider account key, new in Better Auth 1.7.
   *
   * Declared EXPLICITLY rather than relying on genericOAuth's default. The
   * default is `isOidc ? profile.sub : profile.id`, where `isOidc` is inferred
   * at boot from whether MP's discovery document returned
   * `id_token_signing_alg_values_supported`. That makes the account key depend
   * on a network fetch succeeding at startup — a transient discovery failure
   * would silently switch which field identifies the user.
   *
   * `getUserInfo` has already run `extractUserGuid`, so `sub` is a validated,
   * lower-cased MP `User_GUID` by the time this is called.
   */
  accountSubject: ({ profile }) => (profile.sub == null ? "" : String(profile.sub)),
  getUserInfo: async (tokens) => {
    // Fetch the OIDC profile to get the sub (User_GUID)
    const response = await fetch(
      `${mpBaseUrl}/oauth/connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      // Status only — the body can echo profile content.
      console.error("auth.userinfo.fetch_failed", {
        status: response.status,
      });
      return null;
    }

    const profile = await response.json();

    const sub = extractUserGuid(profile);
    if (!sub) {
      // Return null rather than throwing: `provider.getUserInfo` is NOT
      // wrapped in a try/catch in Better Auth's callback route, so a
      // throw surfaces as an unhandled error instead of a clean
      // `unable_to_get_user_info` redirect with no session.
      console.error("auth.userinfo.invalid_sub", {
        hasSub: typeof (profile as { sub?: unknown })?.sub === "string",
      });
      return null;
    }

    const mpEmail =
      typeof profile.email === "string" && profile.email.trim()
        ? profile.email.trim()
        : null;

    return {
      /**
       * The account subject. MUST be `sub`, not `id`.
       *
       * Better Auth 1.7 derives the stable provider account key from
       * `accountSubject(...)` rather than from `profile.id` — the user-info
       * type now literally declares `id?: never`. genericOAuth's default
       * resolver reads `profile.sub` for an OIDC provider, and `accountSubject`
       * below reads it explicitly.
       *
       * Returning `id` here (the 1.6 shape) leaves `sub` undefined, which
       * `resolveOAuthAccountKey` rejects with `OAUTH_ACCOUNT_SUBJECT_INVALID`
       * AFTER a successful token exchange — surfacing to the user as
       * `/auth-error?error=unable_to_get_user_info`.
       */
      sub,
      // What Better Auth stores and keys identity on. NOT the real
      // address — see SYNTHETIC_EMAIL_DOMAIN.
      email: syntheticEmailForSub(sub),
      // The real MP address, carried through for display only.
      mpEmail,
      name: buildDisplayName(profile, mpEmail),
      image: undefined,
      // Report what the provider actually claimed instead of asserting
      // it. Hardcoding `true` here satisfied both halves of Better
      // Auth's implicit-linking condition unconditionally.
      emailVerified: profile.email_verified === true,
    } satisfies GenericOAuthUserInfo;
  },
  // Map the OAuth sub claim (User_GUID) to our custom userGuid field.
  // Better Auth generates its own internal user.id, so we need a
  // separate field to store the MP User_GUID for API lookups.
  // The cast is needed because genericOAuth's type doesn't include
  // additionalFields, but the runtime code does pass extra fields
  // through to createOAuthUser.
  mapProfileToUser: (profile) => {
    // `profile` here is the RAW object `getUserInfo` returned (Better Auth
    // passes it through verbatim), so this reads `sub` for the same reason
    // `accountSubject` does.
    const sub = extractUserGuid(profile);
    if (!sub) {
      // getUserInfo already validated this; if it is gone by now the
      // provider contract has changed and we must not create a user
      // record that cannot be tied back to dp_Users.
      throw new Error("mapProfileToUser: profile has no usable sub");
    }
    return {
      userGuid: sub,
      email: syntheticEmailForSub(sub),
      mpEmail:
        (profile as unknown as { mpEmail?: string | null }).mpEmail ??
        null,
    } as Record<string, unknown>;
  },
};

/**
 * Session lifetime. The app is stateless (no database, no `secondaryStorage`):
 * the signed `session_token` + encrypted `session_data` cookies are the
 * session, backed only by better-auth's per-process in-memory adapter. That
 * rules out real server-side revocation, so these settings instead put a HARD
 * ceiling on how long any session — including a copied or forged cookie pair —
 * can live. Verified against better-auth 1.7.6 source;
 * `src/auth.session-lifetime.test.ts` walks the clock through the real `auth`
 * instance to pin it.
 *
 * - `expiresIn: 12h` — `session.expiresAt` is set once, at sign-in, to
 *   sign-in + 12h. Both `/get-session` paths refuse a session past it (the
 *   cookie-cache path checks the cached `expiresAt`, the memory-adapter path
 *   the stored row). It also sets the `session_token` cookie's Max-Age.
 *   Default was 7 days.
 *
 * - `disableSessionRefresh: true` — without it the memory-adapter path slides
 *   `expiresAt` forward another `expiresIn` once per `updateAge` (1 day), so a
 *   long-running process kept a session alive indefinitely.
 *
 * - `cookieCache.refreshCache: false` — MUST be explicit. With no database,
 *   better-auth defu-merges `refreshCache: true` UNDER this config
 *   (context/create-context.mjs), so leaving it out silently turns it on. With
 *   `true`, `/get-session` re-signs `session_data` from the cookie itself in
 *   the last 20% of `maxAge` with no store lookup at all, so a copied cookie
 *   pair survived the victim's sign-out until `expiresAt` (7 days, before this
 *   change). With `false`, a cookie NOT backed by a live in-memory row — a
 *   pair copied before sign-out, or one forged from a leaked secret — dies
 *   `maxAge` (1h) after it was minted: the request then falls through to the
 *   memory adapter, which re-mints the cache only if the row still exists.
 *   Trade-off: on serverless, a request that lands on an instance without the
 *   row after the hour gets no session and goes back through MP sign-in —
 *   which doubles as an hourly re-check against MP that a disabled login fails.
 *
 * Emergency "sign everyone out": bump `cookieCache.version` and redeploy, or
 * rotate BETTER_AUTH_SECRET (invalidates every signed cookie, including a
 * forged one). See .claude/references/auth/README.md.
 */
export const SESSION_EXPIRES_IN_SECONDS = 12 * 60 * 60;
export const SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = 60 * 60;

/**
 * Blanks the user's MP access and refresh tokens (and their expiries) on an
 * account row before better-auth stores it in the in-memory adapter — where
 * they would otherwise sit in plaintext until restart, and a heap dump would
 * expose every signed-in user's full-scope MP API rights. `getUserInfo` has
 * already used the access token by the time the row is written.
 *
 * The `idToken` is KEPT: it is not an API bearer, and an RP-initiated logout
 * `id_token_hint` (security Step 4) needs it. Exported for tests.
 */
export function stripUserOAuthTokens<T extends object>(account: T): T {
  return {
    ...account,
    accessToken: null,
    refreshToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  };
}

/**
 * Session-row fields withheld from the `/get-session` response (and from
 * server-side `auth.api.getSession`). Nothing in `src/` reads them, and each is
 * more than the page needs:
 * - `token` — the raw session token: a bearer credential the day a `bearer`
 *   plugin is added, which would make the cookie's HttpOnly flag moot.
 * - `ipAddress`, `userAgent` — request metadata better-auth records at
 *   sign-in; not the page's business.
 * better-auth still keeps them on the in-memory row and inside the encrypted
 * `session_data` cookie; this only stops them being handed to page JS.
 */
export const WITHHELD_SESSION_FIELDS = ["token", "ipAddress", "userAgent"] as const;

type WithheldSessionField = (typeof WITHHELD_SESSION_FIELDS)[number];

/**
 * The `customSession` callback, extracted so it can be unit tested (the plugin
 * closes over its callback and never exposes it).
 *
 * No API calls here — profile loading is handled by UserProvider via
 * getCurrentUserProfile(). This keeps getSession() fast and avoids hitting the
 * MP API on every request. It only splits the display name and strips
 * `WITHHELD_SESSION_FIELDS` from the session.
 */
export function enrichSession<
  U extends { name?: string | null },
  S extends object,
>(user: U, session: S) {
  const copy = { ...session } as Record<string, unknown>;
  for (const field of WITHHELD_SESSION_FIELDS) delete copy[field];
  return {
    user: {
      ...user,
      firstName: user.name?.split(" ")[0] || "",
      lastName: user.name?.split(" ").slice(1).join(" ") || "",
    },
    session: copy as Omit<S, WithheldSessionField>,
  };
}

const options = {
  baseURL: authBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  advanced: {
    // Pinned explicitly so an env var cannot flip it: left undefined,
    // better-auth sets `skipOriginCheck = isTest()`, i.e. a truthy `TEST` env
    // var would disable the Origin/callbackURL checks
    // (context/create-context.mjs). See `assertAuthEnvironment` above.
    disableOriginCheck: false,
    // See `parseIpAddressOptions` above.
    ipAddress: parseIpAddressOptions(process.env),
  },
  disabledPaths: disabledAuthPaths,
  // User-level hooks. customSession and nextCookies register their own hooks
  // on the plugin objects; these run alongside them, not instead. If another
  // `before` check is ever needed, compose it INTO this one — there is only
  // one `hooks.before` slot. See `refuseIdTokenSignIn` above.
  hooks: {
    before: refuseIdTokenSignIn,
  },
  /**
   * Send OAuth callback failures to a page this app owns.
   *
   * Better Auth's default is `/api/auth/error`, which the deny-by-default
   * allowlist in the catch-all route now 404s — so without this, a failed
   * sign-in would dead-end on a blank 404 instead of an explanation.
   *
   * `/auth-error` must also be allowlisted as public in `src/proxy.ts`: it sits
   * outside the session gate, and bouncing an unauthenticated visitor to
   * `/signin` — which immediately auto-starts OAuth again — would loop forever.
   */
  onAPIError: {
    errorURL: "/auth-error",
  },
  // See SESSION_EXPIRES_IN_SECONDS above for why each of these is set.
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    disableSessionRefresh: true,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
      // Encrypted (JWE keyed from BETTER_AUTH_SECRET), not just signed. With
      // "jwt" the payload — name, real MP email, userGuid, IP, user agent, the
      // raw session token — was readable by anything that sees Cookie
      // headers: proxy/APM logs, HAR files, cookie-reading extensions.
      // Changing strategy invalidates every existing `session_data` cookie
      // once. `src/auth.session-config.test.ts` guards it.
      strategy: "jwe" as const,
      refreshCache: false,
    },
  },
  account: {
    storeStateStrategy: "cookie" as const,
    // The user's own MP tokens are never used: all MP data access goes
    // through the client-credentials service account. better-auth defaults
    // this to `true` when there is no database, which put the user's MP
    // access/refresh/id tokens into an `account_data` cookie. Keep them out of
    // the browser entirely. See `stripUserOAuthTokens` for the in-memory copy.
    storeAccountCookie: false,
    /**
     * Never merge a new provider account onto an existing user record.
     *
     * Keying users on the synthetic `sub`-derived email (above) already makes a
     * collision impossible, so in practice this never fires. It stays as the
     * second lock: if anything ever reintroduces a real address as the stored
     * email, this turns a silent identity merge into a clean refusal.
     */
    accountLinking: {
      enabled: false,
    },
  },
  user: {
    additionalFields: userAdditionalFields,
  },
  // Applied by the in-memory adapter better-auth uses when there is no
  // database. See `stripUserOAuthTokens` above.
  databaseHooks: {
    account: {
      create: { before: async (account) => ({ data: stripUserOAuthTokens(account) }) },
      update: { before: async (account) => ({ data: stripUserOAuthTokens(account) }) },
    },
  },
  plugins: [
    genericOAuth({
      config: [ministryPlatformProviderConfig],
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => enrichSession(user, session), options),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

import { betterAuth, BetterAuthOptions } from "better-auth";
import {
  genericOAuth,
  type GenericOAuthConfig,
  type GenericOAuthUserInfo,
} from "better-auth/plugins";
import { customSession } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { validateGuid } from "@/lib/validation";

const mpBaseUrl = process.env.MINISTRY_PLATFORM_BASE_URL!;

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
];

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
  scopes: [
    "openid",
    "offline_access",
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

const options = {
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  disabledPaths: disabledAuthPaths,
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60, // 1 hour cache
      strategy: "jwt" as const,
    },
  },
  account: {
    storeStateStrategy: "cookie" as const,
    storeAccountCookie: true,
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
    customSession(
      async ({ user, session }) => {
        // No API calls here — profile loading is handled by UserProvider
        // on the client side via getCurrentUserProfile(). This keeps
        // getSession() fast and avoids hitting the MP API on every request.
        return {
          user: {
            ...user,
            firstName: user.name?.split(" ")[0] || "",
            lastName: user.name?.split(" ").slice(1).join(" ") || "",
          },
          session,
        };
      },
      options,
    ),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

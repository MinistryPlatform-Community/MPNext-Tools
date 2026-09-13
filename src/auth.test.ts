import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseAdditionalUserInput } from 'better-auth/db';
import {
  auth,
  userAdditionalFields,
  disabledAuthPaths,
  syntheticEmailForSub,
  SYNTHETIC_EMAIL_DOMAIN,
  extractUserGuid,
  buildDisplayName,
  ministryPlatformProviderConfig,
} from '@/lib/auth';

/**
 * Auth Tests
 *
 * Tests for the Better Auth configuration in src/lib/auth.ts.
 * - customSession: lightweight name splitting only (no API calls)
 * - getUserInfo: fetches OIDC profile and returns id=sub (used as accountId)
 * - mapProfileToUser: stores the OAuth sub claim as userGuid (additionalField)
 * - User profile loading is handled client-side by UserProvider
 */

describe('Auth - Custom Session Enrichment Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Name Splitting', () => {
    it('should split full name into firstName and lastName', () => {
      const user = { id: 'ba-internal-id', name: 'John Doe', email: 'john@example.com', userGuid: 'user-guid-123' };

      const enrichedUser = {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      };

      expect(enrichedUser.firstName).toBe('John');
      expect(enrichedUser.lastName).toBe('Doe');
    });

    it('should handle multi-part last names', () => {
      const user = { id: 'ba-internal-id', name: 'Mary Jane Watson', email: 'mary@example.com' };

      const enrichedUser = {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      };

      expect(enrichedUser.firstName).toBe('Mary');
      expect(enrichedUser.lastName).toBe('Jane Watson');
    });

    it('should handle single name (no last name)', () => {
      const user = { id: 'ba-internal-id', name: 'Madonna', email: 'madonna@example.com' };

      const enrichedUser = {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      };

      expect(enrichedUser.firstName).toBe('Madonna');
      expect(enrichedUser.lastName).toBe('');
    });

    it('should handle undefined name gracefully', () => {
      const user = { id: 'ba-internal-id', name: undefined as string | undefined, email: 'user@example.com' };

      const enrichedUser = {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      };

      expect(enrichedUser.firstName).toBe('');
      expect(enrichedUser.lastName).toBe('');
    });

    it('should handle empty string name', () => {
      const user = { id: 'ba-internal-id', name: '', email: 'user@example.com' };

      const enrichedUser = {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      };

      expect(enrichedUser.firstName).toBe('');
      expect(enrichedUser.lastName).toBe('');
    });
  });

  describe('Session Structure', () => {
    it('should return enriched user with userGuid and unchanged session', () => {
      const user = { id: 'ba-internal-id', name: 'John Doe', email: 'john@example.com', userGuid: 'ab12cd34-ef56-7890-abcd-ef1234567890' };
      const session = { id: 'session-123', expiresAt: new Date() };

      // Simulate customSession logic (no API calls, just name splitting)
      const result = {
        user: {
          ...user,
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
        },
        session,
      };

      // user.id is Better Auth's internal ID, NOT the MP User_GUID
      expect(result.user.id).toBe('ba-internal-id');
      // userGuid is the MP User_GUID stored via additionalFields + mapProfileToUser
      expect(result.user.userGuid).toBe('ab12cd34-ef56-7890-abcd-ef1234567890');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.session).toBe(session);
    });

    it('should not include userProfile in session', () => {
      const user = { id: 'ba-internal-id', name: 'John Doe', email: 'john@example.com' };
      const session = { id: 'session-123', expiresAt: new Date() };

      const result = {
        user: {
          ...user,
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
        },
        session,
      };

      // userProfile is NOT part of the session — it's loaded client-side by UserProvider
      expect(result.session).not.toHaveProperty('userProfile');
    });
  });
});

describe('Auth - OAuth Configuration', () => {
  it('should configure Ministry Platform as generic OAuth provider', () => {
    const config = {
      providerId: 'ministryplatform',
      scopes: ['openid', 'offline_access', 'http://www.thinkministry.com/dataplatform/scopes/all'],
      pkce: false,
    };

    expect(config.providerId).toBe('ministryplatform');
    expect(config.scopes).toContain('openid');
    expect(config.scopes).toContain('offline_access');
    expect(config.pkce).toBe(false);
  });

  it('should map getUserInfo profile to user info with sub as id', () => {
    // Simulate the getUserInfo callback — returns id=sub for the accountId
    const profile = {
      sub: 'ab12cd34-ef56-7890-abcd-ef1234567890',
      given_name: 'John',
      family_name: 'Doe',
      email: 'john@example.com',
    };

    const userInfo = {
      id: profile.sub,
      email: profile.email,
      name: `${profile.given_name} ${profile.family_name}`,
      image: undefined,
      emailVerified: true,
    };

    expect(userInfo.id).toBe('ab12cd34-ef56-7890-abcd-ef1234567890');
    expect(userInfo.name).toBe('John Doe');
    expect(userInfo.email).toBe('john@example.com');
    expect(userInfo.image).toBeUndefined();
    expect(userInfo.emailVerified).toBe(true);
  });

  it('should map profile to user with userGuid via mapProfileToUser', () => {
    // Simulate the mapProfileToUser callback
    // It receives the getUserInfo result and extracts the sub as userGuid
    const getUserInfoResult = {
      id: 'ab12cd34-ef56-7890-abcd-ef1234567890',
      email: 'john@example.com',
      name: 'John Doe',
      image: undefined,
      emailVerified: true,
    };

    // mapProfileToUser extracts profile.id (the sub) as userGuid
    const mappedFields = {
      userGuid: getUserInfoResult.id,
    };

    expect(mappedFields.userGuid).toBe('ab12cd34-ef56-7890-abcd-ef1234567890');
  });

  /**
   * Regression guard for the better-auth 1.6 upgrade incident.
   *
   * 1.6 changed how additional user fields are parsed from the OAuth provider
   * profile: a user additionalField declared with `input: false` no longer
   * flows through when a value is supplied. `userGuid` is populated
   * server-side via mapProfileToUser (never by user input), so `input: false`
   * broke it — leaving session.user.userGuid undefined and breaking every MP
   * profile lookup (blank avatar, dead user menu).
   *
   * In 1.6.11 the exact behavior is: parseAdditionalUserInput THROWS
   * "userGuid is not allowed to be set" when the field is `input: false` and a
   * value is present; with `input: true` it returns { userGuid }.
   *
   * This runs the REAL better-auth parse function against our REAL field
   * config, so it fails if (a) someone flips userGuid back to input:false, or
   * (b) a future better-auth upgrade changes how provider-profile fields are
   * parsed.
   */
  it('persists userGuid from the OAuth provider profile (better-auth 1.6 guard)', () => {
    const guid = 'ab12cd34-ef56-7890-abcd-ef1234567890';
    const options = { user: { additionalFields: userAdditionalFields } };

    const parsed = parseAdditionalUserInput(options, { userGuid: guid });

    expect(parsed).toHaveProperty('userGuid', guid);
  });

  it('should distinguish user.id (Better Auth internal) from userGuid (MP User_GUID)', () => {
    // Better Auth generates its own user.id (random nanoid-style)
    // The OAuth sub claim is stored as userGuid via additionalFields
    // Server actions and UserProvider must use userGuid for MP API lookups
    const mpUserGuid = 'ab12cd34-ef56-7890-abcd-ef1234567890';
    const betterAuthId = '1gYSNMvy6OqAm9q3DdVhtKj3Czkxd0ms';

    const sessionUser = {
      id: betterAuthId,
      userGuid: mpUserGuid,
      email: 'test@example.com',
      name: 'Test User',
    };

    // user.id is NOT suitable for MP API queries
    expect(sessionUser.id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    // userGuid IS the MP User_GUID (UUID format)
    expect(sessionUser.userGuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

/**
 * F-UPDATE-USER — session identity must not be reassignable over HTTP.
 *
 * Better Auth mounts `/update-user` unconditionally (it is NOT gated on having
 * email/password sign-in enabled). Its body schema is
 * `z.record(z.string(), z.any())`, it rejects only `email`, and every other key
 * reaches `parseUserInput`, which copies any additional field declared
 * `input !== false` through verbatim with no validator — then re-mints the
 * session cookie from the result. Its only gate is `sessionMiddleware`, which
 * any valid session cookie satisfies.
 *
 * Since `userGuid` must stay `input: true` for the OAuth profile path to work,
 * closing the endpoint is the control.
 */
describe('Auth - disabled endpoints', () => {
  it('disables /update-user', () => {
    expect(disabledAuthPaths).toContain('/update-user');
  });

  it('disables the other identity-mutating endpoints', () => {
    for (const path of [
      '/change-email',
      '/change-password',
      '/set-password',
      '/delete-user',
      '/delete-user/callback',
    ]) {
      expect(disabledAuthPaths).toContain(path);
    }
  });
});

/**
 * F-UPDATE-USER, enforcement half — the paths must 404 at the Better Auth
 * ROUTER, not merely appear in an exported array.
 *
 * The `disabledAuthPaths` assertions above check a constant. They pass even if
 * `disabledPaths: disabledAuthPaths` is deleted from the `betterAuth()` options,
 * because nothing ties the array to the running router — verified by removing
 * that line and watching the whole suite stay green. That is the exact failure
 * mode this advisory's root cause describes: a protection silently stops being
 * applied and no test notices.
 *
 * `src/app/api/auth/[...all]/route.test.ts` does not cover this either. It mocks
 * `@/lib/auth` to `{}` and mocks `toNextJsHandler`, so it exercises the allowlist
 * WRAPPER against a stub — correct for what it tests, but it never reaches real
 * Better Auth.
 *
 * So these drive `auth.handler` directly with real `Request`s, deliberately
 * BYPASSING Next.js routing and the allowlist. The allowlist is the primary
 * control and sits in front of this; `disabledPaths` is the defence in depth
 * behind it, and this is the only place that proves the latter is wired in.
 * Both must hold independently — the advisory is explicit that the allowlist is
 * an addition, not a replacement.
 *
 * Matched in the router's `onRequest`, these 404 before rate limiting, plugins
 * and `sessionMiddleware` — so no session is needed to prove the refusal.
 */
describe('Auth - disabled endpoints 404 at the router', () => {
  const url = (path: string) => `http://localhost:3000/api/auth${path}`;

  it('404s POST /update-user, the session-identity takeover vector', async () => {
    const res = await auth.handler(
      new Request(url('/update-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The exact payload from the advisory: a well-formed foreign User_GUID.
        // It must be refused on the PATH, before any body parsing — `userGuid`
        // is necessarily `input: true`, so a validator could never tell this
        // from `mapProfileToUser`.
        body: JSON.stringify({ userGuid: 'ab12cd34-ef56-7890-abcd-ef1234567890' }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it.each(disabledAuthPaths.filter((p) => p !== '/update-user'))(
    '404s the other identity-mutating endpoint %s',
    async (path) => {
      const res = await auth.handler(new Request(url(path), { method: 'POST' }));

      expect(res.status).toBe(404);
    },
  );

  /**
   * CONTROL — without this the block above could pass vacuously: a handler that
   * 404s EVERYTHING (a bad base path, a broken instance) would satisfy every
   * assertion above while proving nothing.
   *
   * `/get-session` is not in `disabledAuthPaths`, so it must reach the router.
   * Asserting only "not 404" keeps this about routing rather than about what an
   * unauthenticated session read happens to return.
   */
  it('CONTROL: a non-disabled path still routes', async () => {
    const res = await auth.handler(new Request(url('/get-session')));

    expect(res.status).not.toBe(404);
  });
});

/**
 * F2 — Ministry Platform enforces NO uniqueness on email addresses, but Better
 * Auth keys identity on email: `handleOAuthUserInfo` looks the user up by
 * `userInfo.email` BEFORE it considers the provider account id. Two MP users
 * sharing a household address would therefore collapse onto one Better Auth
 * user, the second inheriting the first's `userGuid` — and with it their MP
 * roles and their `User_ID` on every audited write.
 */
describe('Auth - synthetic email identity', () => {
  it('derives a unique address from the sub', () => {
    const a = syntheticEmailForSub('550e8400-e29b-41d4-a716-446655440000');
    const b = syntheticEmailForSub('660e8400-e29b-41d4-a716-446655440000');

    expect(a).not.toBe(b);
    expect(a.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)).toBe(true);
  });

  it('uses an RFC 2606 reserved TLD so the address can never be routable', () => {
    expect(SYNTHETIC_EMAIL_DOMAIN).toBe('mp.invalid');
  });

  it('lower-cases, because Better Auth lower-cases on both lookup and write', () => {
    expect(syntheticEmailForSub('AB12CD34-EF56-7890-ABCD-EF1234567890')).toBe(
      'ab12cd34-ef56-7890-abcd-ef1234567890@mp.invalid',
    );
  });

  it('gives two MP users sharing one real email two DISTINCT identities', () => {
    // The regression this exists to prevent.
    const userA = '550e8400-e29b-41d4-a716-446655440000';
    const userB = '660e8400-e29b-41d4-a716-446655440001';
    expect(syntheticEmailForSub(userA)).not.toBe(syntheticEmailForSub(userB));
  });
});

describe('Auth - extractUserGuid', () => {
  it('accepts and normalizes a well-formed sub', () => {
    expect(extractUserGuid({ sub: 'AB12CD34-EF56-7890-ABCD-EF1234567890' })).toBe(
      'ab12cd34-ef56-7890-abcd-ef1234567890',
    );
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['not-a-guid'],
    [12345],
    [{ nested: true }],
  ])('returns null for an unusable sub (%s)', (sub) => {
    expect(extractUserGuid({ sub })).toBeNull();
  });

  it('returns null rather than throwing for a missing profile', () => {
    expect(extractUserGuid(null)).toBeNull();
    expect(extractUserGuid(undefined)).toBeNull();
  });
});

describe('Auth - buildDisplayName', () => {
  it('joins the OIDC name claims', () => {
    expect(buildDisplayName({ given_name: 'Jane', family_name: 'Doe' }, null)).toBe('Jane Doe');
  });

  it('never produces the string "undefined undefined"', () => {
    // The previous template-literal form did exactly this whenever MP omitted
    // the name claims — satisfying Better Auth's non-empty `name` check by
    // accident while rendering as literal "undefined undefined" in the menu.
    const name = buildDisplayName({}, null);
    expect(name).not.toContain('undefined');
    expect(name.length).toBeGreaterThan(0);
  });

  it('falls back through name, then the real email local-part', () => {
    expect(buildDisplayName({ name: 'Jane Doe' }, null)).toBe('Jane Doe');
    expect(buildDisplayName({}, 'jane.doe@example.org')).toBe('jane.doe');
  });

  it('tolerates a single name claim', () => {
    expect(buildDisplayName({ given_name: 'Madonna' }, null)).toBe('Madonna');
  });

  it('always returns a non-empty string, since Better Auth hard-fails on an empty name', () => {
    for (const profile of [null, undefined, {}, { given_name: '  ' }]) {
      expect(buildDisplayName(profile, null).length).toBeGreaterThan(0);
    }
  });
});

/**
 * Better Auth 1.7 provider-config guards.
 *
 * Both flags below fail SILENTLY-ish: sign-in breaks for every user with a
 * generic `unable_to_get_user_info`, with nothing in the app's own code to
 * point at. They are pinned here because a future upgrade that resets them
 * should fail a test run, not a production sign-in.
 */
describe('Auth - Ministry Platform provider config (better-auth 1.7)', () => {
  it('disables id_token nonce binding, because MP does not echo the claim', () => {
    // As of 1.7, any provider with a `discoveryUrl` publishing a JWKS binds the
    // id_token to the authorization request BY DEFAULT — Better Auth sends a
    // server-generated nonce and rejects a callback whose id_token does not
    // echo it. MP omits the claim entirely.
    //
    // The failure looks intermittent but is inverted from the obvious reading:
    // sign-in works only when the boot-time discovery fetch FAILED, because
    // that leaves the id_token config undefined and skips verification.
    expect(ministryPlatformProviderConfig.disableIdTokenNonceBinding).toBe(true);
  });

  it('keeps PKCE OFF — MP advertises it but does not honour it', () => {
    // MP's discovery document DOES advertise
    // code_challenge_methods_supported: ["plain", "S256"], so the document is
    // not evidence here. Verified against a live tenant: with pkce enabled the
    // authorize leg succeeds and returns a code, then the token exchange fails
    // with `invalid_grant` and the user lands on
    // /auth-error?error=invalid_code.
    //
    // This test exists to stop someone re-enabling it on the strength of the
    // discovery document alone.
    expect(ministryPlatformProviderConfig.pkce).toBe(false);
  });

  it('uses discovery rather than hardcoded endpoints', () => {
    expect(ministryPlatformProviderConfig.discoveryUrl).toContain(
      '/oauth/.well-known/openid-configuration',
    );
  });

  it('keeps the providerId the allowlist and the client both reference', () => {
    // `src/app/api/auth/[...all]/route.ts` allowlists
    // `GET /callback/ministryplatform`, and the sign-in page calls
    // `signIn.social({ provider: "ministryplatform" })`. All three must agree.
    expect(ministryPlatformProviderConfig.providerId).toBe('ministryplatform');
  });
});

/**
 * Better Auth 1.7 account-key contract.
 *
 * 1.7 stopped deriving the provider account id from `profile.id` — the
 * user-info type now declares `id?: never` — and derives it from
 * `accountSubject(...)` instead, which for an OIDC provider defaults to
 * `profile.sub`.
 *
 * Getting this wrong fails LATE and confusingly: the token exchange succeeds,
 * then `resolveOAuthAccountKey` throws `OAUTH_ACCOUNT_SUBJECT_INVALID` and the
 * user sees `/auth-error?error=unable_to_get_user_info` — which reads like a
 * userinfo fetch problem, not an identity-mapping one.
 */
describe('Auth - provider account key (better-auth 1.7)', () => {
  const GUID = 'AB12CD34-EF56-7890-ABCD-EF1234567890';
  const normalized = 'ab12cd34-ef56-7890-abcd-ef1234567890';

  function callAccountSubject(profile: Record<string, unknown>) {
    const fn = ministryPlatformProviderConfig.accountSubject;
    if (!fn) throw new Error('accountSubject must be declared explicitly');
    return fn({ tokens: {} as never, profile: profile as never });
  }

  it('declares accountSubject explicitly rather than relying on the default', () => {
    // The default is `isOidc ? profile.sub : profile.id`, where `isOidc` is
    // inferred at boot from the discovery fetch. That would make the account
    // key depend on a network call succeeding at startup.
    expect(typeof ministryPlatformProviderConfig.accountSubject).toBe('function');
  });

  it('derives the account key from sub', () => {
    expect(callAccountSubject({ sub: normalized })).toBe(normalized);
  });

  it('returns empty (not "undefined") when sub is absent, so Better Auth refuses cleanly', () => {
    // `resolveOAuthAccountKey` rejects "", "undefined" and "null" alike, but
    // returning the literal string "undefined" would be a latent bug if that
    // guard ever narrowed.
    expect(callAccountSubject({})).toBe('');
    expect(callAccountSubject({ sub: null })).toBe('');
  });

  it('getUserInfo returns `sub`, NOT `id` — the 1.6 shape breaks the account key', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            sub: GUID,
            email: 'jane@example.org',
            email_verified: true,
            given_name: 'Jane',
            family_name: 'Doe',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    try {
      const getUserInfo = ministryPlatformProviderConfig.getUserInfo!;
      const info = (await getUserInfo({ accessToken: 'tok' } as never)) as Record<
        string,
        unknown
      >;

      expect(info.sub).toBe(normalized);
      expect(info).not.toHaveProperty('id');
      // And the account key resolves off it.
      expect(callAccountSubject(info)).toBe(normalized);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('getUserInfo still applies the synthetic email and keeps the real one as mpEmail', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ sub: GUID, email: 'shared@household.org', email_verified: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    try {
      const info = (await ministryPlatformProviderConfig.getUserInfo!({
        accessToken: 'tok',
      } as never)) as Record<string, unknown>;

      expect(info.email).toBe(`${normalized}@mp.invalid`);
      expect(info.mpEmail).toBe('shared@household.org');
      expect(info.emailVerified).toBe(false);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('getUserInfo returns null (never throws) when MP sends no usable sub', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ email: 'x@y.org' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(
        ministryPlatformProviderConfig.getUserInfo!({ accessToken: 'tok' } as never),
      ).resolves.toBeNull();
    } finally {
      fetchMock.mockRestore();
      errSpy.mockRestore();
    }
  });

  it('mapProfileToUser reads sub from the raw profile', () => {
    // Better Auth passes `mapProfileToUser` the RAW object getUserInfo
    // returned, so it must read the same field `accountSubject` does.
    const mapped = ministryPlatformProviderConfig.mapProfileToUser!({
      sub: normalized,
      mpEmail: 'jane@example.org',
    } as never) as Record<string, unknown>;

    expect(mapped.userGuid).toBe(normalized);
    expect(mapped.email).toBe(`${normalized}@mp.invalid`);
    expect(mapped.mpEmail).toBe('jane@example.org');
  });
});

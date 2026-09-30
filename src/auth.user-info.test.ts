// @vitest-environment node
// (node, not jsdom: `getUserInfo` verifies the id_token with `jose` over
// WebCrypto, which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { OAuth2Tokens } from 'better-auth/oauth2';

/**
 * `getUserInfo` of the Ministry Platform provider (src/lib/auth.ts), called
 * directly with GENUINELY signed id_tokens from the mock MP
 * (src/test-utils/mock-oidc.ts). Since security Step 4 it verifies the
 * id_token itself — RS256 against MP's JWKS, `iss`, `aud` — then checks
 * `sub` / `exp` / `azp`, then fetches userinfo and binds its `sub` to the
 * id_token's. Every refusal returns null (better-auth's callback route does
 * not catch a throw) and logs one structured line carrying identifiers only
 * (CLAUDE.md rule 14): never a token, a GUID, a body or `err.message`.
 *
 * `stubUserinfo` replaces ONLY the userinfo response; discovery and the JWKS
 * still come from the mock MP, whose `fetch` throws for any URL it does not
 * serve, so nothing here can reach a real Ministry Platform.
 */

const oidc = await vi.hoisted(async () =>
  (await import('@/test-utils/mock-oidc')).installMockOidc(),
);

import { ministryPlatformProviderConfig, USERINFO_TIMEOUT_MS } from '@/lib/auth';
import { MOCK_USERINFO_URL } from '@/test-utils/mock-oidc';

// Captured before any test spies on `fetch`, so `stubUserinfo` can always
// hand everything but userinfo to the mock MP (and never recurse).
const mockMpFetch = globalThis.fetch;
const CLIENT_ID = process.env.MP_OIDC_CLIENT_ID!;

/**
 * Replaces ONLY the userinfo response. Returns a mock of just the userinfo
 * calls, as `(url, init)` — assert "userinfo was never called" on it, not on
 * `fetch`, because discovery and the JWKS legitimately go through `fetch`.
 */
function stubUserinfo(respond: () => Response | Promise<Response>) {
  const userinfo = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => respond());
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    return url === MOCK_USERINFO_URL ? userinfo(url, init) : mockMpFetch(input, init);
  });
  return userinfo;
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

function getUserInfo(tokens: Partial<OAuth2Tokens>) {
  const fn = ministryPlatformProviderConfig.getUserInfo;
  if (!fn) throw new Error('getUserInfo must be declared');
  return fn(tokens as OAuth2Tokens) as Promise<Record<string, unknown> | null>;
}

/** The structured (JSON) events written to console.error. */
function loggedEvents(): Array<Record<string, unknown>> {
  return vi.mocked(console.error).mock.calls.flatMap(([line]) => {
    try {
      return [JSON.parse(String(line)) as Record<string, unknown>];
    } catch {
      return [];
    }
  });
}

const loggedText = () => vi.mocked(console.error).mock.calls.flat().join(' ');

beforeEach(() => {
  oidc.reset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a verified, matching id_token + userinfo pair', () => {
  const GUID = 'ab12cd34-ef56-7890-abcd-ef1234567890';

  it('returns `sub` (NOT `id` — the 1.6 shape breaks the account key) and resolves the account subject off it', async () => {
    stubUserinfo(() =>
      jsonResponse({ sub: GUID.toUpperCase(), given_name: 'Jane', family_name: 'Doe', email: 'jane@example.org' }),
    );

    const info = await getUserInfo({ accessToken: 'tok', idToken: oidc.signIdToken({ sub: GUID }) });

    expect(info).toMatchObject({ sub: GUID, name: 'Jane Doe' });
    expect(info).not.toHaveProperty('id');
    expect(
      ministryPlatformProviderConfig.accountSubject!({ tokens: {} as never, profile: info as never }),
    ).toBe(GUID);
  });

  it('applies the synthetic email and keeps the real one, trimmed, as mpEmail', async () => {
    stubUserinfo(() => jsonResponse({ sub: GUID, email: '  shared@household.org  ' }));

    const info = await getUserInfo({ accessToken: 'tok', idToken: oidc.signIdToken({ sub: GUID }) });

    expect(info?.email).toBe(`${GUID}@mp.invalid`);
    expect(info?.mpEmail).toBe('shared@household.org');
  });

  it('nulls mpEmail when the profile email is blank or missing', async () => {
    stubUserinfo(() => jsonResponse({ sub: GUID, email: '   ' }));
    expect((await getUserInfo({ accessToken: 't', idToken: oidc.signIdToken({ sub: GUID }) }))?.mpEmail).toBeNull();
  });

  it.each([
    ['omitted', {}, false],
    ['false', { email_verified: false }, false],
    ['a truthy non-boolean', { email_verified: 'true' }, false],
    ['true', { email_verified: true }, true],
  ])('reports emailVerified only as MP claimed it (%s)', async (_label, claim, expected) => {
    stubUserinfo(() => jsonResponse({ sub: GUID, ...claim }));

    const info = await getUserInfo({ accessToken: 't', idToken: oidc.signIdToken({ sub: GUID }) });

    expect(info?.emailVerified).toBe(expected);
  });

  it('sends the access token as a bearer, with a 10 s timeout, refusing redirects', async () => {
    expect(USERINFO_TIMEOUT_MS).toBe(10_000);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const userinfo = stubUserinfo(() => jsonResponse({ sub: GUID }));

    await getUserInfo({ accessToken: 'token-abc', idToken: oidc.signIdToken({ sub: GUID }) });

    expect(userinfo).toHaveBeenCalledTimes(1);
    const [url, init] = userinfo.mock.calls[0];
    expect(url).toBe(`${process.env.MINISTRY_PLATFORM_BASE_URL}/oauth/connect/userinfo`);
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
    expect(init!.redirect).toBe('error');
    // (The discovery and JWKS requests set their own, shorter, timeouts.)
    const call = timeoutSpy.mock.calls.findIndex(([ms]) => ms === USERINFO_TIMEOUT_MS);
    expect(call).toBeGreaterThanOrEqual(0);
    expect(init!.signal).toBe(timeoutSpy.mock.results[call].value);
  });
});

describe('the userinfo request never throws', () => {
  const GUID = 'ab12cd34-ef56-7890-abcd-ef1234596001';
  const tokens = () => ({ accessToken: 'secret-access-token', idToken: oidc.signIdToken({ sub: GUID }) });

  function onlyEvent() {
    const events = loggedEvents();
    expect(events).toHaveLength(1);
    expect(loggedText()).not.toContain('secret-access-token');
    return events[0];
  }

  it('returns null on a non-2xx, logging only the status and never reading the body', async () => {
    const body = vi.fn();
    stubUserinfo(() => {
      const response = new Response('{"secret":"profile-content"}', { status: 403 });
      response.json = body;
      return response;
    });

    await expect(getUserInfo(tokens())).resolves.toBeNull();

    expect(onlyEvent()).toEqual({
      event: 'auth.userinfo.fetch_failed',
      message: expect.any(String),
      reason: 'http_status',
      status: 403,
    });
    expect(body).not.toHaveBeenCalled();
  });

  it('returns null when fetch rejects (network error / timeout)', async () => {
    stubUserinfo(() => Promise.reject(new DOMException('The operation timed out', 'TimeoutError')));

    await expect(getUserInfo(tokens())).resolves.toBeNull();
    expect(onlyEvent()).toMatchObject({ reason: 'request_failed', errName: 'TimeoutError' });
  });

  it('returns null when fetch rejects with a non-Error value', async () => {
    stubUserinfo(() => Promise.reject('boom'));

    await expect(getUserInfo(tokens())).resolves.toBeNull();
    expect(onlyEvent()).toMatchObject({ reason: 'request_failed', errName: 'string' });
  });

  it('returns null for a non-JSON 200 (a proxy HTML error page), without logging the body', async () => {
    stubUserinfo(() => new Response('<html>Gateway says hi to member@example.com</html>', { status: 200 }));

    await expect(getUserInfo(tokens())).resolves.toBeNull();
    expect(onlyEvent()).toMatchObject({ event: 'auth.userinfo.fetch_failed', reason: 'invalid_json', errName: 'SyntaxError' });
    expect(loggedText()).not.toContain('member@example.com');
  });

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"sub"'],
  ])('returns null when the JSON body is %s (not an object)', async (_label, raw) => {
    stubUserinfo(() => new Response(raw, { status: 200 }));

    await expect(getUserInfo(tokens())).resolves.toBeNull();
    expect(onlyEvent()).toMatchObject({ reason: 'not_an_object' });
  });

  it.each([
    ['missing', {}, false],
    ['not a GUID', { sub: 'not-a-guid' }, true],
    ['a number', { sub: 12345 }, false],
  ])('returns null when the userinfo sub is %s', async (_label, profile, hasSub) => {
    stubUserinfo(() => jsonResponse({ email: 'x@y.org', ...profile }));

    await expect(getUserInfo(tokens())).resolves.toBeNull();
    expect(onlyEvent()).toEqual({ event: 'auth.userinfo.invalid_sub', message: expect.any(String), hasSub });
  });
});

/**
 * The verification itself. Each refusal happens BEFORE userinfo is called,
 * so a refused token never spends (or leaks) the access token.
 */
describe('id_token verification (verifyMpIdToken) and claim checks', () => {
  const GUID = 'ab12cd34-ef56-7890-abcd-ef1234595001';
  const userinfoFor = () => stubUserinfo(() => jsonResponse({ sub: GUID, given_name: 'Pat' }));

  async function expectRefusedBeforeUserinfo(idToken: string, logged: Record<string, unknown>) {
    const userinfo = userinfoFor();
    await expect(getUserInfo({ accessToken: 'access-token', idToken })).resolves.toBeNull();
    expect(userinfo).not.toHaveBeenCalled();
    expect(loggedEvents()).toContainEqual(expect.objectContaining(logged));
    // Identifiers only: the token never reaches the log.
    expect(loggedText()).not.toContain(idToken);
  }

  it.each([
    ['an exp in the past', { exp: Math.floor(Date.now() / 1000) - 60 }, { code: 'ERR_JWT_EXPIRED' }],
    ['a non-numeric exp', { exp: 'tomorrow' }, { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'exp' }],
    ['a foreign issuer', { iss: 'https://evil.example/oauth' }, { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'iss' }],
    ['another client as the audience', { aud: 'some-other-client' }, { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'aud' }],
    // The service account's client id is NOT this app's sign-in audience.
    ['the service-account client as the audience', { aud: process.env.MINISTRY_PLATFORM_CLIENT_ID }, { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'aud' }],
  ])('jose refuses an id_token with %s', async (_label, claims, code) => {
    await expectRefusedBeforeUserinfo(oidc.signIdToken({ sub: GUID, ...claims }), {
      event: 'auth.userinfo.id_token_unverified',
      reason: 'verification_failed',
      ...code,
    });
  });

  it('refuses an id_token signed by a key the JWKS does not publish', async () => {
    oidc.state.foreignKey = true;
    await expectRefusedBeforeUserinfo(oidc.signIdToken({ sub: GUID }), {
      event: 'auth.userinfo.id_token_unverified',
      reason: 'verification_failed',
      code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
    });
  });

  /** An HS256 token (HMAC of `payload` under `secret`) naming the mock JWKS key's `kid`. */
  const hs256 = (payload: Record<string, unknown>, secret: string) => {
    const input = `${Buffer.from(JSON.stringify({ alg: 'HS256', kid: 'test-key-1', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
    return `${input}.${createHmac('sha256', secret).update(input).digest('base64url')}`;
  };
  const unsigned = (claims: Record<string, unknown>) =>
    `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
  const validClaims = () => ({ iss: oidc.issuer, aud: CLIENT_ID, sub: GUID, exp: 4102444800 });

  it.each([
    ['not three segments', () => 'only.two', 'ERR_JWS_INVALID'],
    ['a five-segment JWE', () => 'a.b.c.d.e', 'ERR_JWS_INVALID'],
    ['a header that is not JSON', () => `x.${Buffer.from('{}').toString('base64url')}.y`, 'ERR_JWS_INVALID'],
    // Algorithm confusion: neither client secret is a verification key here.
    ['HS256 signed with the OIDC client secret', () => hs256(validClaims(), process.env.MP_OIDC_CLIENT_SECRET!), 'ERR_JOSE_ALG_NOT_ALLOWED'],
    ['HS256 signed with the service-account secret', () => hs256(validClaims(), process.env.MINISTRY_PLATFORM_CLIENT_SECRET!), 'ERR_JOSE_ALG_NOT_ALLOWED'],
    ['unsigned (alg: none)', () => unsigned(validClaims()), 'ERR_JOSE_ALG_NOT_ALLOWED'],
  ])('refuses a malformed or unverifiable id_token (%s)', async (_label, token, code) => {
    await expectRefusedBeforeUserinfo(token(), {
      event: 'auth.userinfo.id_token_unverified',
      reason: 'verification_failed',
      code,
    });
  });

  it.each([
    ['no exp', { exp: undefined }, 'missing_exp'],
    ['aud: [other, ours] with azp: other', { aud: ['other-client', CLIENT_ID], azp: 'other-client' }, 'azp_mismatch'],
    ['aud: [other, ours] with no azp', { aud: ['other-client', CLIENT_ID] }, 'azp_mismatch'],
  ])('refuses a verified id_token with %s (the app’s own claim checks)', async (_label, claims, reason) => {
    await expectRefusedBeforeUserinfo(oidc.signIdToken({ sub: GUID, ...claims }), {
      event: 'auth.userinfo.id_token_claims_invalid',
      reason,
    });
  });

  it.each([
    ['a single string aud', { aud: CLIENT_ID }],
    ['aud: [other, ours] with azp: ours', { aud: ['other-client', CLIENT_ID], azp: CLIENT_ID }],
  ])('accepts %s', async (_label, claims) => {
    userinfoFor();
    await expect(
      getUserInfo({ accessToken: 'access-token', idToken: oidc.signIdToken({ sub: GUID, ...claims }) }),
    ).resolves.toMatchObject({ sub: GUID });
  });
});

/**
 * F12's defence-in-depth layer: the userinfo `sub` (what the ACCESS token
 * says) must equal the verified id_token `sub`. `/sign-in/social`'s id_token
 * mode called `getUserInfo` with a CALLER-SUPPLIED access token, so without
 * this an attacker's own id_token plus a victim's access token signed in as
 * the victim. End to end in src/auth.id-token-sign-in.test.ts.
 */
describe('id_token sub binding (auth.userinfo.sub_mismatch)', () => {
  const userinfoSub = 'ab12cd34-ef56-7890-abcd-ef1234597001';
  const attackerSub = 'ab12cd34-ef56-7890-abcd-ef1234597002';

  it('accepts a matching sub', async () => {
    stubUserinfo(() => jsonResponse({ sub: userinfoSub }));
    await expect(
      getUserInfo({ accessToken: 'a', idToken: oidc.signIdToken({ sub: userinfoSub }) }),
    ).resolves.toMatchObject({ sub: userinfoSub });
  });

  it('accepts a case-only difference (GUID case carries no meaning)', async () => {
    stubUserinfo(() => jsonResponse({ sub: userinfoSub }));
    await expect(
      getUserInfo({ accessToken: 'a', idToken: oidc.signIdToken({ sub: userinfoSub.toUpperCase() }) }),
    ).resolves.toMatchObject({ sub: userinfoSub });
  });

  it('refuses a userinfo sub that differs from the id_token sub (token substitution)', async () => {
    const userinfo = stubUserinfo(() => jsonResponse({ sub: userinfoSub }));

    await expect(
      getUserInfo({ accessToken: 'victim-access-token', idToken: oidc.signIdToken({ sub: attackerSub }) }),
    ).resolves.toBeNull();

    expect(userinfo).toHaveBeenCalledTimes(1);
    expect(loggedEvents()).toEqual([
      { event: 'auth.userinfo.sub_mismatch', message: expect.any(String), reason: 'mismatch' },
    ]);
    // Identifiers only: neither GUID nor any token content reaches the log.
    expect(loggedText()).not.toContain(attackerSub);
    expect(loggedText()).not.toContain(userinfoSub);
    expect(loggedText()).not.toContain('victim-access-token');
  });

  // Signed and verified, so the refusal is the app's check: jose type-checks
  // `sub` only when asked to match a given subject.
  it.each([
    ['missing', { sub: undefined }],
    ['empty', { sub: '' }],
    ['non-string', { sub: 12345 }],
  ])('refuses an id_token whose sub is %s, before calling userinfo', async (_label, claims) => {
    const userinfo = stubUserinfo(() => jsonResponse({ sub: userinfoSub }));

    await expect(getUserInfo({ accessToken: 'a', idToken: oidc.signIdToken(claims) })).resolves.toBeNull();

    expect(userinfo).not.toHaveBeenCalled();
    expect(loggedEvents()).toContainEqual(expect.objectContaining({ event: 'auth.userinfo.sub_mismatch', reason: 'missing_sub' }));
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
  ])('refuses when the id_token is %s, before any MP call', async (_label, idToken) => {
    const userinfo = stubUserinfo(() => jsonResponse({ sub: userinfoSub }));
    const fetchesBefore = oidc.calls.length;

    await expect(getUserInfo({ accessToken: 'a', idToken })).resolves.toBeNull();

    expect(userinfo).not.toHaveBeenCalled();
    expect(oidc.calls.length).toBe(fetchesBefore);
    expect(loggedEvents()).toEqual([
      { event: 'auth.userinfo.sub_mismatch', message: expect.any(String), reason: 'missing_id_token' },
    ]);
  });
});

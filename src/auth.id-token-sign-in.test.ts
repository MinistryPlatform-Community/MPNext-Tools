// @vitest-environment node
// (node, not jsdom: better-auth verifies the id_token with `jose` over WebCrypto,
// which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { genericOAuth, type GenericOAuthConfig, type GenericOAuthOptions } from 'better-auth/plugins';

/**
 * F12 — end-to-end guard for the `/sign-in/social` id_token token-substitution
 * account takeover (upstream advisory 2026-09-25).
 *
 * better-auth 1.7's `/sign-in/social` has an id_token mode: given
 * `idToken: { token, accessToken }` it verifies the id_token (signature, iss,
 * aud) and then calls our `getUserInfo` with the CALLER'S access token. This
 * fork sets `discoveryUrl`, so the mode is live for the "ministryplatform"
 * provider, and nothing binds the verified id_token's `sub` to the access
 * token's userinfo `sub`: an attacker's own valid id_token plus a victim's
 * access token mints a session as the victim.
 *
 * These tests drive the REAL `auth` instance from src/lib/auth.ts against a
 * mock MP OIDC provider (discovery, JWKS and userinfo), with id_tokens really
 * RS256-signed by a key the mock JWKS publishes — so better-auth's own
 * verification genuinely passes and the only thing standing between the
 * attacker and the victim's session is this app's code. `fetch` is replaced
 * with a stub that THROWS for any URL the mock doesn't serve: nothing here can
 * reach a real Ministry Platform.
 *
 * Layers, each proven with the others out of the way:
 * - `refuseIdTokenSignIn` (`hooks.before`) — here, driving `auth.handler`
 *   directly, i.e. with the route filter bypassed.
 * - The route's body filter — src/app/api/auth/[...all]/route.test.ts, with
 *   Better Auth (and so the hook) mocked out.
 * - `/link-social` in `disabledAuthPaths` — here, bypassing the route.
 * - `requireIdTokenVerification` — here, on an instance whose discovery
 *   document lacks `jwks_uri`.
 *
 * NOT YET: the `id_token.sub` <-> userinfo `sub` binding inside `getUserInfo`
 * lands with the OIDC lazy-discovery rewrite (security Step 4). The "KNOWN GAP"
 * test below pins today's behaviour with the hook removed, and must be flipped
 * to a refusal when that binding lands.
 */

const mockOidc = await vi.hoisted(async () => {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const base = 'https://test-mp.example.com';
  const issuer = `${base}/oauth`;
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key-1', alg: 'RS256', use: 'sig' };

  const subs = {
    attacker: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    victim: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  };
  const accessTokens: Record<string, string> = {
    'access-token-attacker': subs.attacker,
    'access-token-victim': subs.victim,
  };
  const userinfoCalls: string[] = [];

  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  function signIdToken(sub: string): string {
    const now = Math.floor(Date.now() / 1000);
    const input = `${b64({ alg: 'RS256', kid: 'test-key-1', typ: 'JWT' })}.${b64({
      iss: issuer,
      aud: 'test-client-id',
      sub,
      iat: now,
      exp: now + 300,
    })}`;
    return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const discovery = {
    issuer,
    authorization_endpoint: `${issuer}/connect/authorize`,
    token_endpoint: `${issuer}/connect/token`,
    userinfo_endpoint: `${issuer}/connect/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks`,
    id_token_signing_alg_values_supported: ['RS256'],
  };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = request.url;
    if (url === `${issuer}/.well-known/openid-configuration`) {
      return json(discovery);
    }
    // A discovery document with no jwks_uri, for requireIdTokenVerification.
    if (url === `${base}/no-jwks/.well-known/openid-configuration`) {
      const { jwks_uri: _omit, ...rest } = discovery;
      void _omit;
      return json(rest);
    }
    if (url === `${issuer}/.well-known/jwks`) {
      return json({ keys: [jwk] });
    }
    if (url === `${issuer}/connect/userinfo`) {
      const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      userinfoCalls.push(token);
      const sub = accessTokens[token];
      return sub
        ? json({ sub, given_name: 'Test', family_name: 'User', email: `${sub}@example.test` })
        : json({ error: 'invalid_token' }, 401);
    }
    throw new Error(`Blocked unexpected fetch in test: ${url}`);
  }) as typeof fetch;

  return { base, subs, signIdToken, userinfoCalls };
});

import { auth, ID_TOKEN_SIGN_IN_DISABLED } from '@/lib/auth';

const ORIGIN = 'http://localhost:3000';
const PROVIDER = 'ministryplatform';

function post(
  instance: { handler: (r: Request) => Promise<Response> },
  path: string,
  body: unknown,
) {
  return instance.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify(body),
    }),
  );
}

const signInSocial = (instance: { handler: (r: Request) => Promise<Response> }, body: unknown) =>
  post(instance, '/sign-in/social', body);

function sessionCookies(response: Response): string[] {
  return response.headers.getSetCookie().filter((c) => /session_token=/.test(c));
}

/** The attack body: attacker's own valid id_token, victim's access token. */
function attackBody() {
  return {
    provider: PROVIDER,
    idToken: {
      token: mockOidc.signIdToken(mockOidc.subs.attacker),
      accessToken: 'access-token-victim',
    },
  };
}

/** Rebuilds the genericOAuth plugin with a modified provider config. */
function pluginsWith(patch: Partial<GenericOAuthConfig>) {
  return (auth.options.plugins ?? []).map((plugin) => {
    if (plugin.id !== 'generic-oauth') return plugin;
    const [config] = (plugin as unknown as { options: GenericOAuthOptions }).options.config;
    return genericOAuth({ config: [{ ...config, ...patch }] });
  });
}

beforeEach(() => {
  mockOidc.userinfoCalls.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('refuseIdTokenSignIn (hooks.before) — primary control, route filter bypassed', () => {
  it('refuses the id_token mode over HTTP with 404 ID_TOKEN_SIGN_IN_DISABLED, minting no session', async () => {
    const response = await signInSocial(auth, attackBody());

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: ID_TOKEN_SIGN_IN_DISABLED });
    expect(sessionCookies(response)).toEqual([]);
    // Refused before better-auth ever used the caller's access token.
    expect(mockOidc.userinfoCalls).toEqual([]);
  });

  it('refuses the id_token mode for in-process auth.api.signInSocial calls too', async () => {
    await expect(auth.api.signInSocial({ body: attackBody() })).rejects.toMatchObject({
      statusCode: 404,
      body: expect.objectContaining({ code: ID_TOKEN_SIGN_IN_DISABLED }),
    });
    expect(mockOidc.userinfoCalls).toEqual([]);
  });

  it.each([
    ['null', null],
    ['an empty object', {}],
    ['false', false],
  ])('keys on the presence of idToken, not its truthiness (idToken: %s)', async (_label, idToken) => {
    const response = await signInSocial(auth, { provider: PROVIDER, idToken });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: ID_TOKEN_SIGN_IN_DISABLED });
  });

  it('CONTROL: the normal redirect sign-in (no idToken) still returns the authorize URL', async () => {
    const response = await signInSocial(auth, { provider: PROVIDER, callbackURL: '/' });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string; redirect: boolean };
    expect(body.redirect).toBe(true);
    expect(body.url).toMatch(/^https:\/\/test-mp\.example\.com\/oauth\/connect\/authorize\?/);
  });

  it.each([
    ['JSON null', 'null'],
    ['a JSON string', '"idToken"'],
    ['a JSON array', '["idToken"]'],
  ])('does not throw on a non-object body (%s); schema validation rejects it instead', async (_label, raw) => {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: raw,
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code?: string };
    expect(body.code).not.toBe(ID_TOKEN_SIGN_IN_DISABLED);
  });

  it('leaves other endpoints alone, even with an idToken key in the body', async () => {
    const getSession = await auth.handler(new Request(`${ORIGIN}/api/auth/get-session`));
    expect(getSession.status).toBe(200);

    const signOut = await post(auth, '/sign-out', { idToken: 'x' });
    expect(await signOut.text()).not.toContain(ID_TOKEN_SIGN_IN_DISABLED);
  });
});

describe('with the hook removed — the mode is live on this config (discoveryUrl is set)', () => {
  // Same config, same plugins, same getUserInfo — only the user hook is gone.
  const authWithoutHook = betterAuth({ ...auth.options, hooks: {} });

  it('CONTROL: a matched id_token + access token pair signs in, so the fixture really exercises the mode', async () => {
    const response = await signInSocial(authWithoutHook, {
      provider: PROVIDER,
      idToken: {
        token: mockOidc.signIdToken(mockOidc.subs.victim),
        accessToken: 'access-token-victim',
      },
    });

    expect(response.status).toBe(200);
    expect(sessionCookies(response)).not.toEqual([]);
  });

  it('KNOWN GAP until Step 4: without the hook, the substituted token signs in AS THE VICTIM', async () => {
    // This is exactly why the hook (and the route filter) must stay. When the
    // `id_token.sub` <-> userinfo `sub` binding lands in `getUserInfo`
    // (Step 4), this test must be flipped to expect a refusal.
    const response = await signInSocial(authWithoutHook, attackBody());

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: { userGuid: string } };
    expect(body.user.userGuid).toBe(mockOidc.subs.victim);
    expect(mockOidc.userinfoCalls).toEqual(['access-token-victim']);
  });
});

describe('/link-social is disabled at the router (its own id_token branch)', () => {
  it('404s POST /link-social with an idToken body, bypassing the route allowlist', async () => {
    const response = await post(auth, '/link-social', attackBody());

    expect(response.status).toBe(404);
    expect(mockOidc.userinfoCalls).toEqual([]);
  });

  it('CONTROL: with /link-social re-enabled, the router reaches the endpoint (not a 404)', async () => {
    const reopened = betterAuth({
      ...auth.options,
      disabledPaths: (auth.options.disabledPaths ?? []).filter((p) => p !== '/link-social'),
    });

    const response = await post(reopened, '/link-social', attackBody());

    // Without a session it fails on auth, but it is routed — proving the 404
    // above comes from `disabledPaths`, not from a missing endpoint.
    expect(response.status).not.toBe(404);
  });
});

describe('requireIdTokenVerification — refuse to run with an unverified id_token', () => {
  const noJwksDiscovery = `${mockOidc.base}/no-jwks/.well-known/openid-configuration`;

  it('skips the provider when discovery yields no jwks_uri, so sign-in 404s instead of downgrading', async () => {
    const instance = betterAuth({
      ...auth.options,
      plugins: pluginsWith({ discoveryUrl: noJwksDiscovery }),
    });

    const response = await signInSocial(instance, { provider: PROVIDER, callbackURL: '/' });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'PROVIDER_NOT_FOUND' });
  });

  it('CONTROL: without the flag, the same discovery document registers the provider with NO id_token verification', async () => {
    const instance = betterAuth({
      ...auth.options,
      plugins: pluginsWith({ discoveryUrl: noJwksDiscovery, requireIdTokenVerification: false }),
    });

    const response = await signInSocial(instance, { provider: PROVIDER, callbackURL: '/' });

    expect(response.status).toBe(200);
  });
});

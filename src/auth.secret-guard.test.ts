// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Guard for `assertAuthEnvironment` in src/lib/auth.ts (review item
 * security-auth-secret-fallback-and-test-flag).
 *
 * With no secret, better-auth 1.7.6 signs sessions with its PUBLIC default
 * secret and only refuses that when NODE_ENV is "production"; a truthy `TEST`
 * env var skips its validation entirely. In stateless mode a known secret
 * means anyone can mint a session for any userGuid. These tests prove that
 * IMPORTING `@/lib/auth` throws for each bad configuration — removing the
 * module-level call (or any single check) turns them red.
 *
 * `fetch` is stubbed to throw so nothing can leave the process (building the
 * auth instance makes no MP call; discovery is loaded lazily at the first
 * sign-in callback, which these tests never reach).
 *
 * Imports with `VITEST` cleared go through `sharedInstance`, which caches the
 * instance on globalThis; the cache is cleared around every test so each
 * import really builds a new instance from the env it was given.
 */

// Every test re-imports `@/lib/auth` from a reset module graph, which is slow
// under coverage instrumentation on a loaded runner; give it headroom rather
// than let a cold import trip the 5 s default.
vi.setConfig({ testTimeout: 30_000 });

const GOOD_SECRET = 'a-perfectly-fine-test-secret-0123456789';
const KEYS = [
  'VITEST', 'BETTER_AUTH_SECRET', 'NEXTAUTH_SECRET', 'BETTER_AUTH_SECRETS', 'NODE_ENV', 'TEST',
  'BETTER_AUTH_URL', 'NEXTAUTH_URL', 'MINISTRY_PLATFORM_BASE_URL',
  'MP_OIDC_CLIENT_ID', 'MP_OIDC_CLIENT_SECRET', 'MINISTRY_PLATFORM_CLIENT_ID', 'MINISTRY_PLATFORM_CLIENT_SECRET',
] as const;
// test-setup.ts stubs an http://localhost BETTER_AUTH_URL, which src/lib/env.ts
// refuses in production; the production cases below use this one instead.
const PROD_URL = 'https://app.example.org';
let saved: Record<string, string | undefined>;

const SHARED_AUTH_KEY = Symbol.for('mpnext-tools.auth');
const clearSharedAuth = () => {
  delete (globalThis as Record<symbol, unknown>)[SHARED_AUTH_KEY];
};

beforeEach(() => {
  clearSharedAuth();
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
    throw new Error(`Blocked unexpected fetch in test: ${String(input)}`);
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  clearSharedAuth();
  setEnv(saved);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Sets the env for one import; `undefined` deletes the variable. */
function setEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/** Import `@/lib/auth` fresh with the Vitest exemption switched OFF. */
async function importAuthAsIfNotVitest() {
  setEnv({ VITEST: undefined });
  return import('@/lib/auth');
}

describe('assertAuthEnvironment at module load', () => {
  it('control: a valid secret imports cleanly outside the Vitest exemption', async () => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, NEXTAUTH_SECRET: undefined, BETTER_AUTH_SECRETS: undefined, TEST: undefined });
    const mod = await importAuthAsIfNotVitest();
    expect(mod.auth).toBeDefined();
  });

  it('control: NEXTAUTH_SECRET is still accepted as the fallback', async () => {
    setEnv({ BETTER_AUTH_SECRET: undefined, NEXTAUTH_SECRET: GOOD_SECRET, BETTER_AUTH_SECRETS: undefined, TEST: undefined });
    await expect(importAuthAsIfNotVitest()).resolves.toHaveProperty('auth');
  });

  it('refuses to import with no secret at all (development, NODE_ENV unset)', async () => {
    setEnv({ BETTER_AUTH_SECRET: undefined, NEXTAUTH_SECRET: undefined, NODE_ENV: undefined, TEST: undefined });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/BETTER_AUTH_SECRET is not set/);
  });

  it('refuses to import with an empty secret', async () => {
    setEnv({ BETTER_AUTH_SECRET: '', NEXTAUTH_SECRET: undefined, NODE_ENV: 'development' });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/BETTER_AUTH_SECRET is not set/);
  });

  it('refuses to import with better-auth\'s public default secret, even outside production', async () => {
    setEnv({
      BETTER_AUTH_SECRET: 'better-auth-secret-12345678901234567890',
      NODE_ENV: 'development',
    });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/public default secret/);
  });

  it('refuses to import with a secret shorter than 32 characters', async () => {
    setEnv({ BETTER_AUTH_SECRET: 'changeme', NODE_ENV: 'development' });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/at least 32 characters/);
  });

  it('refuses to import when BETTER_AUTH_SECRETS would silently override the validated secret', async () => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, BETTER_AUTH_SECRETS: '1:some-other-secret-value-0123456789' });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/BETTER_AUTH_SECRETS is set/);
  });

  it.each(['1', 'true', 'yes'])('refuses to import with TEST=%s on a production process', async (flag) => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, BETTER_AUTH_SECRETS: undefined, NODE_ENV: 'production', TEST: flag, BETTER_AUTH_URL: PROD_URL });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/TEST is set on a production process/);
  });

  it('allows TEST=false on a production process (better-auth reads it as false too)', async () => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, BETTER_AUTH_SECRETS: undefined, NODE_ENV: 'production', TEST: 'false', BETTER_AUTH_URL: PROD_URL });
    await expect(importAuthAsIfNotVitest()).resolves.toHaveProperty('auth');
  });

  it('never puts the secret in the error message', async () => {
    const shortSecret = 'short-but-secret';
    setEnv({ BETTER_AUTH_SECRET: shortSecret, NODE_ENV: 'development' });
    const error = await importAuthAsIfNotVitest().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(shortSecret);
  });

  it('is skipped under Vitest (the only exemption), so tests can build instances freely', async () => {
    setEnv({ VITEST: 'true', BETTER_AUTH_SECRET: GOOD_SECRET, NODE_ENV: 'production', TEST: '1', BETTER_AUTH_URL: PROD_URL });
    await expect(import('@/lib/auth')).resolves.toHaveProperty('auth');
  });
});

/**
 * Review item security-auth-url-env-not-validated: the two auth-critical URLs are
 * validated at module load (src/lib/env.ts has the per-value cases). Unlike the
 * secret guard these run under Vitest too, so no exemption is switched off.
 */
describe('auth-critical URLs at module load', () => {
  it.each([
    ['BETTER_AUTH_URL', { BETTER_AUTH_URL: undefined, NEXTAUTH_URL: undefined }, /BETTER_AUTH_URL is not set/],
    ['MINISTRY_PLATFORM_BASE_URL', { MINISTRY_PLATFORM_BASE_URL: undefined }, /MINISTRY_PLATFORM_BASE_URL is not set/],
  ])('refuses to import with %s unset (no Host-header fallback, no undefined/oauth)', async (_n, env, message) => {
    setEnv(env);
    await expect(import('@/lib/auth')).rejects.toThrow(message);
  });

  it('refuses an http:// BETTER_AUTH_URL on a production process', async () => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, NODE_ENV: 'production', TEST: undefined, BETTER_AUTH_URL: 'http://app.example.org' });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/BETTER_AUTH_URL must use https:\/\//);
  });

  it('accepts a loopback http BETTER_AUTH_URL on a production process (local / CI next build)', async () => {
    setEnv({ BETTER_AUTH_SECRET: GOOD_SECRET, NODE_ENV: 'production', TEST: undefined, BETTER_AUTH_URL: 'http://localhost:3000' });
    const { auth } = await importAuthAsIfNotVitest();
    expect(auth.options.baseURL).toBe('http://localhost:3000');
  });

  it('refuses an http:// MINISTRY_PLATFORM_BASE_URL in any environment', async () => {
    setEnv({ MINISTRY_PLATFORM_BASE_URL: 'http://mp.example.org' });
    await expect(import('@/lib/auth')).rejects.toThrow(/MINISTRY_PLATFORM_BASE_URL must use https:\/\//);
  });

  it('uses the normalized values: origin-only baseURL, no //oauth', async () => {
    setEnv({ BETTER_AUTH_URL: 'https://app.example.org/', MINISTRY_PLATFORM_BASE_URL: 'https://mp.example.org/api/' });
    const { auth, ministryPlatformProviderConfig } = await import('@/lib/auth');
    expect(auth.options.baseURL).toBe('https://app.example.org');
    expect(ministryPlatformProviderConfig.authorizationUrl).toBe(
      'https://mp.example.org/api/oauth/connect/authorize',
    );
    expect(ministryPlatformProviderConfig.tokenUrl).toBe('https://mp.example.org/api/oauth/connect/token');
    expect(ministryPlatformProviderConfig.endSessionEndpoint).toBe(
      'https://mp.example.org/api/oauth/connect/endsession',
    );
    // Building the instance (and its context) contacted nothing.
    await auth.$context;
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('the OIDC sign-in client at module load (owner decision: dedicated client)', () => {
  const sharedClientWarnings = () =>
    vi.mocked(console.warn).mock.calls.flatMap(([line]) => {
      try {
        const event = JSON.parse(String(line)) as Record<string, unknown>;
        return event.event === 'auth.oidc.shared_client' ? [event] : [];
      } catch {
        return [];
      }
    });

  it('uses the dedicated MP_OIDC_CLIENT_ID / _SECRET, not the service account, and does not warn', async () => {
    setEnv({ MP_OIDC_CLIENT_ID: 'oidc-app', MP_OIDC_CLIENT_SECRET: 'oidc-secret', MINISTRY_PLATFORM_CLIENT_ID: 'svc' });
    const { ministryPlatformProviderConfig } = await importAuthAsIfNotVitest();
    expect(ministryPlatformProviderConfig.clientId).toBe('oidc-app');
    expect(ministryPlatformProviderConfig.clientSecret).toBe('oidc-secret');
    expect(sharedClientWarnings()).toEqual([]);
  });

  it('falls back to the service-account client with ONE auth.oidc.shared_client warning per process', async () => {
    setEnv({
      MP_OIDC_CLIENT_ID: undefined,
      MP_OIDC_CLIENT_SECRET: undefined,
      MINISTRY_PLATFORM_CLIENT_ID: 'svc',
      MINISTRY_PLATFORM_CLIENT_SECRET: 'svc-secret',
    });
    const first = await importAuthAsIfNotVitest();
    vi.resetModules();
    const second = await importAuthAsIfNotVitest(); // another Next bundle layer

    expect(second.auth).toBe(first.auth);
    expect(first.ministryPlatformProviderConfig.clientId).toBe('svc');
    expect(sharedClientWarnings()).toEqual([
      { event: 'auth.oidc.shared_client', message: expect.any(String), source: 'fallback' },
    ]);
    // Identifiers only: never the client id or secret.
    const logged = vi.mocked(console.warn).mock.calls.flat().join(' ');
    expect(logged).not.toContain('svc-secret');
    expect(logged).not.toMatch(/"svc"/);
  });

  it('warns when the "dedicated" client is the service-account id', async () => {
    setEnv({ MP_OIDC_CLIENT_ID: 'svc', MP_OIDC_CLIENT_SECRET: 'x', MINISTRY_PLATFORM_CLIENT_ID: 'svc' });
    await importAuthAsIfNotVitest();
    expect(sharedClientWarnings()).toEqual([expect.objectContaining({ source: 'same_as_service_account' })]);
  });

  it('stays silent during next build (NEXT_PHASE), whose workers are separate processes', async () => {
    const { warnIfSharedOidcClient } = await import('@/lib/auth');
    vi.mocked(console.warn).mockClear();
    warnIfSharedOidcClient({ shared: 'fallback' }, { NEXT_PHASE: 'phase-production-build' });
    expect(sharedClientWarnings()).toEqual([]);
    warnIfSharedOidcClient({ shared: 'fallback' }, { NEXT_PHASE: 'phase-production-server' });
    expect(sharedClientWarnings()).toHaveLength(1);
    warnIfSharedOidcClient({ shared: null }, {});
    expect(sharedClientWarnings()).toHaveLength(1);
  });

  it('refuses to import with only half of the dedicated pair set', async () => {
    setEnv({ MP_OIDC_CLIENT_ID: 'oidc-app', MP_OIDC_CLIENT_SECRET: undefined });
    await expect(importAuthAsIfNotVitest()).rejects.toThrow(/MP_OIDC_CLIENT_ID and MP_OIDC_CLIENT_SECRET must be set together/);
  });
});

describe('assertAuthEnvironment (pure function)', () => {
  it('accepts a valid configuration', async () => {
    const { assertAuthEnvironment } = await import('@/lib/auth');
    expect(() => assertAuthEnvironment({ BETTER_AUTH_SECRET: GOOD_SECRET, NODE_ENV: 'production' })).not.toThrow();
  });

  it('prefers BETTER_AUTH_SECRET over NEXTAUTH_SECRET, like the auth options do', async () => {
    const { assertAuthEnvironment } = await import('@/lib/auth');
    expect(() =>
      assertAuthEnvironment({ BETTER_AUTH_SECRET: 'short', NEXTAUTH_SECRET: GOOD_SECRET }),
    ).toThrow(/at least 32 characters/);
  });

  it('pins the same default secret the installed better-auth ships (drift guard)', async () => {
    const { BETTER_AUTH_DEFAULT_SECRET } = await import('@/lib/auth');
    // DEFAULT_SECRET is not exported by better-auth; read its source instead.
    const constants = readFileSync(
      path.join(process.cwd(), 'node_modules/better-auth/dist/utils/constants.mjs'),
      'utf8',
    );
    expect(constants).toContain(`DEFAULT_SECRET = "${BETTER_AUTH_DEFAULT_SECRET}"`);
  });
});

describe('advanced.disableOriginCheck', () => {
  it('is pinned to false so a TEST env var cannot switch the origin check off', async () => {
    const { auth } = await import('@/lib/auth');
    expect(auth.options.advanced?.disableOriginCheck).toBe(false);
    const context = await auth.$context;
    expect(context.skipOriginCheck).toBe(false);
  });
});

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
 * `fetch` is stubbed to throw so nothing can leave the process (this fork's
 * genericOAuth config fetches discovery when the instance initialises; the
 * blocked fetch just leaves the provider unregistered, which these tests don't
 * exercise).
 */

const GOOD_SECRET = 'a-perfectly-fine-test-secret-0123456789';
const KEYS = [
  'VITEST', 'BETTER_AUTH_SECRET', 'NEXTAUTH_SECRET', 'BETTER_AUTH_SECRETS', 'NODE_ENV', 'TEST',
  'BETTER_AUTH_URL', 'NEXTAUTH_URL', 'MINISTRY_PLATFORM_BASE_URL',
] as const;
// test-setup.ts stubs an http://localhost BETTER_AUTH_URL, which src/lib/env.ts
// refuses in production; the production cases below use this one instead.
const PROD_URL = 'https://app.example.org';
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
    throw new Error(`Blocked unexpected fetch in test: ${String(input)}`);
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
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
    expect(ministryPlatformProviderConfig.discoveryUrl).toBe(
      'https://mp.example.org/api/oauth/.well-known/openid-configuration',
    );
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

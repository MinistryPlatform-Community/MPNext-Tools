// @vitest-environment node
// (node, not jsdom: better-auth verifies the id_token with `jose` over WebCrypto,
// which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';

/**
 * Clock-walk guard for the session lifetime settings in src/lib/auth.ts
 * (security Step 3, playbook Phase 3). Ported from upstream MPNext.
 *
 * Signs in through the REAL `auth` instance with the full authorization-code
 * flow against a mock MP OIDC provider (discovery, JWKS, token, userinfo — the
 * id_token genuinely RS256-signed), then steps a fake clock and replays the
 * cookies to `GET /api/auth/get-session` exactly as a browser (or an attacker
 * holding a copied cookie pair) would. `fetch` THROWS for any URL the mock
 * does not serve, so nothing here can reach a real Ministry Platform.
 *
 * Pinned (better-auth 1.7.6):
 * - Hard ceiling: no session is valid after sign-in + 12h, on the cookie-cache
 *   path or the in-memory-adapter path, however often it is used.
 * - A cookie pair not backed by a live in-memory row (copied before sign-out,
 *   or on an instance that never saw the sign-in) dies within 1h of being
 *   minted.
 * The negative control rebuilds the instance with the pre-fix session config
 * and shows the same walk survives ~7 days — so deleting `expiresIn` or
 * `refreshCache: false` turns this suite red.
 */

const oidc = await vi.hoisted(async () =>
  (await import('@/test-utils/mock-oidc')).installMockOidc(),
);

import { auth, SESSION_EXPIRES_IN_SECONDS, SESSION_COOKIE_CACHE_MAX_AGE_SECONDS } from '@/lib/auth';
import { codeFlow, CookieJar, getSession, signOut, type AuthLike } from '@/test-utils/mock-oidc';

const ORIGIN = 'http://localhost:3000';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const T0 = new Date('2026-09-30T08:00:00Z').getTime();

async function signIn(instance: AuthLike): Promise<CookieJar> {
  const { jar, location } = await codeFlow(instance, ORIGIN);
  expect(location).not.toMatch(/error/);
  expect(jar.get('session_token')).toBeTruthy();
  expect(jar.get('session_data')).toBeTruthy();
  return jar;
}

async function userGuid(instance: AuthLike, jar: CookieJar): Promise<string | null> {
  const body = await getSession(instance, ORIGIN, jar);
  return (body?.user?.userGuid as string | undefined) ?? null;
}

/** A copy of the jar without the cookies whose names match. */
function without(jar: CookieJar, pattern: RegExp): CookieJar {
  const copy = new CookieJar(jar);
  for (const name of [...copy.cookies.keys()]) if (pattern.test(name)) copy.cookies.delete(name);
  return copy;
}

/**
 * Steps the clock by `step` from T0 and asks for the session each time, for up
 * to `limit`. Returns the last instant (ms after T0) the session was still
 * valid and the first instant it was not.
 */
async function walk(instance: AuthLike, jar: CookieJar, step: number, limit: number) {
  let lastValid = 0;
  for (let t = step; t <= limit; t += step) {
    vi.setSystemTime(T0 + t);
    const guid = await userGuid(instance, jar);
    if (guid === null) return { lastValid, firstInvalid: t };
    expect(guid).toBe(oidc.sub);
    lastValid = t;
  }
  return { lastValid, firstInvalid: null };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('session lifetime settings', () => {
  it('pins the configured values (12h absolute, no sliding, encrypted, no cookie-only re-mint)', () => {
    expect(SESSION_EXPIRES_IN_SECONDS).toBe(12 * 60 * 60);
    expect(SESSION_COOKIE_CACHE_MAX_AGE_SECONDS).toBe(60 * 60);
    expect(auth.options.session).toMatchObject({
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      disableSessionRefresh: true,
      cookieCache: {
        enabled: true,
        maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
        strategy: 'jwe',
        refreshCache: false,
      },
    });
  });

  it('resolves refreshCache to off in the live context (the stateless default did not win)', async () => {
    const context = await auth.$context;
    expect(context.sessionConfig.cookieRefreshCache).toBe(false);
    expect(context.sessionConfig.expiresIn).toBe(SESSION_EXPIRES_IN_SECONDS);
  });
});

describe('clock walk through the real auth instance', () => {
  it('an actively used session (cookie cache + in-memory row) never survives sign-in + 12h', async () => {
    const jar = await signIn(auth);
    // Poll every 10 minutes, as a busy tab would.
    const result = await walk(auth, jar, 10 * MINUTE, 3 * DAY);

    // better-auth's check is `expiresAt < now`, so the last valid instant is
    // exactly sign-in + 12h and the next step is refused.
    expect(result.lastValid).toBe(12 * HOUR);
    expect(result.firstInvalid).toBe(12 * HOUR + 10 * MINUTE);
  });

  // `disableSessionRefresh` is defence in depth here: better-auth only slides
  // `expiresAt` once per `updateAge` (1 day), longer than the 12h `expiresIn`.
  // Its removal is caught by the config pin above; it matters the day someone
  // raises `expiresIn` past `updateAge`.
  it('the in-memory-adapter path alone does not slide expiresAt (no session_data cookie)', async () => {
    const jar = without(await signIn(auth), /session_data/);
    const result = await walk(auth, jar, 30 * MINUTE, 3 * DAY);

    expect(result.lastValid).toBe(12 * HOUR);
    expect(result.firstInvalid).toBe(12 * HOUR + 30 * MINUTE);
  });

  it('a cookie pair copied before sign-out dies within 1h of being minted', async () => {
    const victim = await signIn(auth);
    const copied = new CookieJar(victim);

    vi.setSystemTime(T0 + 5 * MINUTE);
    await signOut(auth, ORIGIN, victim);
    expect(await userGuid(auth, victim)).toBeNull();

    // The attacker replays the copy every 5 minutes.
    const result = await walk(auth, copied, 5 * MINUTE, 3 * DAY);

    expect(result.firstInvalid).not.toBeNull();
    expect(result.firstInvalid).toBeLessThanOrEqual(SESSION_COOKIE_CACHE_MAX_AGE_SECONDS * 1000 + 5 * MINUTE);
  });

  it('a cookie pair on an instance with no in-memory row (serverless) dies within 1h', async () => {
    const jar = await signIn(auth);
    // Same config and secret, but it never saw the sign-in — like a different
    // serverless container.
    const otherInstance = betterAuth({ ...auth.options });
    const maxAgeMs = SESSION_COOKIE_CACHE_MAX_AGE_SECONDS * 1000;

    vi.setSystemTime(T0 + maxAgeMs);
    expect(await userGuid(otherInstance, jar)).toBe(oidc.sub);
    vi.setSystemTime(T0 + maxAgeMs + 1000);
    expect(await userGuid(otherInstance, jar)).toBeNull();
  });
});

/**
 * Negative control: the pre-fix session block (1h JWT cookie cache and nothing
 * else). Proves the walks above can detect a regression — this is the 7-day
 * window the TODO describes.
 */
describe('negative control: pre-fix session config', () => {
  const preFix = betterAuth({
    ...auth.options,
    session: { cookieCache: { enabled: true, maxAge: 60 * 60, strategy: 'jwt' } },
  });

  it('a copied cookie pair survives sign-out and silently re-mints until ~7 days', async () => {
    const victim = await signIn(preFix);
    const copied = new CookieJar(victim);
    vi.setSystemTime(T0 + 5 * MINUTE);
    await signOut(preFix, ORIGIN, victim);

    const result = await walk(preFix, copied, 50 * MINUTE, 8 * DAY);

    // 50-minute steps: last valid at 201 x 50 min (6.98 days), refused at the
    // next step (7.01 days) — the default 7-day expiresAt, re-minted all along.
    expect(result.lastValid).toBe(201 * 50 * MINUTE);
    expect(result.firstInvalid).toBe(202 * 50 * MINUTE);
  });
});

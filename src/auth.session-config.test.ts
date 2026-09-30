// @vitest-environment node
// (node, not jsdom: better-auth verifies the id_token with `jose` over WebCrypto,
// which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { symmetricDecodeJWT } from 'better-auth/crypto';

/**
 * Pins what the session cookies the real `auth` instance sets actually carry
 * (security Step 3, playbook Phase 3), so a better-auth upgrade that changes
 * stateless defaults, or a config edit, cannot ship unnoticed:
 * - exactly `session_token` + `session_data`, no `account_data` cookie
 *   (`storeAccountCookie: false`), with the pinned Max-Age values;
 * - `session_data` is a JWE: opaque without the secret, and its DECRYPTED
 *   payload carries no MP OAuth token;
 * - `/get-session` withholds `token`, `ipAddress` and `userAgent`.
 *
 * `fetch` THROWS for any URL the mock OIDC server does not serve.
 */

const oidc = await vi.hoisted(async () =>
  (await import('@/test-utils/mock-oidc')).installMockOidc(),
);

import {
  auth,
  enrichSession,
  SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  WITHHELD_SESSION_FIELDS,
} from '@/lib/auth';
import { codeFlow, getSession, MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN } from '@/test-utils/mock-oidc';

const ORIGIN = 'http://localhost:3000';
const T0 = new Date('2026-09-30T08:00:00Z').getTime();

/** Set-Cookie lines keyed by cookie name, attributes lower-cased for matching. */
function setCookies(response: Response): Map<string, { value: string; attrs: string[] }> {
  const out = new Map<string, { value: string; attrs: string[] }>();
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...attrs] = line.split(';').map((s) => s.trim());
    const eq = pair.indexOf('=');
    out.set(pair.slice(0, eq), { value: pair.slice(eq + 1), attrs: attrs.map((a) => a.toLowerCase()) });
  }
  return out;
}

beforeEach(() => {
  oidc.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('cookies set at sign-in', () => {
  it('sets exactly session_token and session_data — no account_data cookie', async () => {
    const { response } = await codeFlow(auth, ORIGIN);
    const cookies = setCookies(response);

    const names = [...cookies.keys()].filter((n) => /session|account/.test(n)).sort();
    expect(names).toEqual(['better-auth.session_data', 'better-auth.session_token']);

    expect(cookies.get('better-auth.session_token')!.attrs).toEqual(
      expect.arrayContaining(['httponly', 'samesite=lax', 'path=/', `max-age=${SESSION_EXPIRES_IN_SECONDS}`]),
    );
    expect(cookies.get('better-auth.session_data')!.attrs).toEqual(
      expect.arrayContaining(['httponly', 'samesite=lax', 'path=/', `max-age=${SESSION_COOKIE_CACHE_MAX_AGE_SECONDS}`]),
    );
  });

  it('no cookie value carries the MP access, refresh or id token', async () => {
    const { response } = await codeFlow(auth, ORIGIN);
    const idToken = oidc.lastIdToken!;
    expect(idToken).toBeTruthy();
    for (const { value } of setCookies(response).values()) {
      expect(value).not.toContain(MOCK_ACCESS_TOKEN);
      expect(value).not.toContain(MOCK_REFRESH_TOKEN);
      expect(value).not.toContain(idToken);
    }
  });

  it('negative control: with storeAccountCookie left at the stateless default, an account_data cookie appears', async () => {
    const leaky = betterAuth({ ...auth.options, account: { ...auth.options.account, storeAccountCookie: true } });
    const { response } = await codeFlow(leaky, ORIGIN);
    expect([...setCookies(response).keys()].some((n) => n.endsWith('account_data'))).toBe(true);
  });
});

describe('what the session_data cookie contains', () => {
  it('is a JWE (five segments), not a readable JWT', async () => {
    const { jar } = await codeFlow(auth, ORIGIN);
    const value = decodeURIComponent(jar.get('session_data')!);
    expect(value.split('.')).toHaveLength(5);
    // A JWT's payload segment would base64-decode to JSON naming the user.
    expect(Buffer.from(value, 'base64url').toString('utf8')).not.toContain(oidc.sub);
  });

  it('decrypts to better-auth session + user only, with no OAuth token anywhere', async () => {
    const { jar } = await codeFlow(auth, ORIGIN);
    const context = await auth.$context;

    const payload = (await symmetricDecodeJWT(
      decodeURIComponent(jar.get('session_data')!),
      context.secretConfig,
      'better-auth-session',
    )) as { session: Record<string, unknown>; user: Record<string, unknown> } | null;

    expect(payload).not.toBeNull();
    const { user, session } = payload!;
    expect(user.userGuid).toBe(oidc.sub);
    expect(session.userId).toBe(user.id);
    expect(new Date(String(session.expiresAt)).getTime()).toBe(T0 + SESSION_EXPIRES_IN_SECONDS * 1000);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(MOCK_ACCESS_TOKEN);
    expect(serialized).not.toContain(MOCK_REFRESH_TOKEN);
    expect(serialized).not.toContain(oidc.lastIdToken!);
    expect(serialized).not.toMatch(/accessToken|refreshToken|idToken/);
  });
});

describe('/get-session withholds token, ipAddress and userAgent', () => {
  it('the HTTP response carries none of them, and still the user', async () => {
    const { jar } = await codeFlow(auth, ORIGIN);
    const body = await getSession(auth, ORIGIN, jar);

    expect(body?.user.userGuid).toBe(oidc.sub);
    expect(body?.user.firstName).toBe('Code');
    expect(body?.user.lastName).toBe('Flow');
    for (const field of WITHHELD_SESSION_FIELDS) expect(body?.session).not.toHaveProperty(field);
    expect(body?.session).toHaveProperty('expiresAt');
  });

  it('server-side auth.api.getSession carries none of them either', async () => {
    const { jar } = await codeFlow(auth, ORIGIN);
    const session = await auth.api.getSession({ headers: new Headers({ Cookie: jar.header() }) });
    expect(session?.user.userGuid).toBe(oidc.sub);
    for (const field of WITHHELD_SESSION_FIELDS) expect(session?.session).not.toHaveProperty(field);
  });
});

describe('enrichSession', () => {
  const session = { id: 's1', userId: 'u1', expiresAt: new Date(T0), token: 't', ipAddress: '1.2.3.4', userAgent: 'ua' };

  it('strips exactly the withheld fields and does not mutate its input', () => {
    const result = enrichSession({ name: 'Ada Lovelace' }, session);
    expect(result.session).toEqual({ id: 's1', userId: 'u1', expiresAt: new Date(T0) });
    expect(session.token).toBe('t');
  });

  it('splits the display name', () => {
    expect(enrichSession({ name: 'Mary Jane Watson' }, session).user).toMatchObject({
      firstName: 'Mary',
      lastName: 'Jane Watson',
    });
    expect(enrichSession({ name: 'Madonna' }, session).user).toMatchObject({ firstName: 'Madonna', lastName: '' });
    expect(enrichSession({ name: null }, session).user).toMatchObject({ firstName: '', lastName: '' });
  });
});

// @vitest-environment node
// (node, not jsdom: `getUserInfo` verifies the id_token with `jose` over
// WebCrypto, which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Regression guard for the one-`auth`-per-process fix (`sharedInstance` in
 * src/lib/auth.ts, security Step 4). Next loads src/lib/auth.ts once per
 * bundle layer, so the `/api/auth` route handler (OAuth callback,
 * `/get-session`) and the sign-out server action ran in different module
 * copies with different in-memory stores: the logout URL never carried
 * `id_token_hint`, and sign-out could not delete the session row
 * `/get-session` is served from.
 *
 * `vi.resetModules()` + a second `import()` reproduces "a second layer": two
 * module copies in one process. `VITEST` is cleared so the real (non-test)
 * path runs. `fetch` THROWS for any URL the mock does not serve, so nothing
 * here can reach a real Ministry Platform.
 */

const oidc = await vi.hoisted(async () =>
  (await import('@/test-utils/mock-oidc')).installMockOidc(),
);

import { codeFlow, getSession, type CookieJar } from '@/test-utils/mock-oidc';

type AuthModule = typeof import('@/lib/auth');

const ORIGIN = 'http://localhost:3000';
const MINUTE = 60 * 1000;
const T0 = new Date('2026-09-30T08:00:00Z').getTime();
const KEY = Symbol.for('mpnext-tools.auth');
const savedVitest = process.env.VITEST;

/** Imports src/lib/auth as a fresh module copy — what a separate Next bundle layer gets. */
async function loadLayer(): Promise<AuthModule> {
  vi.resetModules();
  return import('@/lib/auth');
}

async function sessionGuid({ auth }: AuthModule, jar: CookieJar) {
  return ((await getSession(auth, ORIGIN, jar))?.user.userGuid as string | undefined) ?? null;
}

beforeEach(() => {
  oidc.reset();
  delete (globalThis as Record<symbol, unknown>)[KEY];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env.VITEST = savedVitest;
  delete (globalThis as Record<symbol, unknown>)[KEY];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('sharedInstance', () => {
  it('returns one instance per process outside Vitest', async () => {
    const { sharedInstance } = await loadLayer();
    const key = Symbol('test-shared');
    const create = vi.fn(() => ({}));
    const a = sharedInstance(key, create, {});
    const b = sharedInstance(key, create, {});
    expect(a).toBe(b);
    expect(create).toHaveBeenCalledTimes(1);
    delete (globalThis as Record<symbol, unknown>)[key];
  });

  it('builds a fresh instance under Vitest', async () => {
    const { sharedInstance } = await loadLayer();
    const key = Symbol('test-vitest');
    const a = sharedInstance(key, () => ({}), { VITEST: 'true' });
    const b = sharedInstance(key, () => ({}), { VITEST: 'true' });
    expect(a).not.toBe(b);
    expect((globalThis as Record<symbol, unknown>)[key]).toBeUndefined();
  });

  it('two module copies (two Next layers) get the same auth instance', async () => {
    delete process.env.VITEST;
    const routeLayer = await loadLayer();
    const actionLayer = await loadLayer();
    expect(routeLayer).not.toBe(actionLayer); // really two module copies
    expect(actionLayer.auth).toBe(routeLayer.auth);
  });
});

describe('sign-in in the route layer, sign-out in the server-action layer', () => {
  async function run() {
    const routeLayer = await loadLayer();
    const actionLayer = await loadLayer();
    const { jar, location } = await codeFlow(routeLayer.auth, ORIGIN);
    expect(location).toBe('/');
    expect(await sessionGuid(routeLayer, jar)).toBe(oidc.sub);

    const result = (await actionLayer.auth.api.signOut({
      headers: new Headers({ Cookie: jar.header() }),
      body: { disableRedirect: true },
    } as never)) as { url?: string };

    // A copied cookie pair, replayed after the 1 h cookie cache, against the route layer.
    vi.setSystemTime(T0 + 61 * MINUTE);
    const replayed = await sessionGuid(routeLayer, jar);
    return { url: result.url, replayed };
  }

  it('shared: the logout URL carries id_token_hint and the replayed cookie is dead', async () => {
    delete process.env.VITEST;
    const { url, replayed } = await run();
    expect(new URL(url!).searchParams.get('id_token_hint')).toBe(oidc.lastIdToken);
    expect(replayed).toBeNull();
  });

  it('negative control: separate copies (the pre-fix behaviour) lose both', async () => {
    process.env.VITEST = 'true';
    const { url, replayed } = await run();
    // No account row with an id_token in this copy: at best a hint-less URL.
    expect(url ? new URL(url).searchParams.get('id_token_hint') : null).toBeNull();
    expect(replayed).toBe(oidc.sub);
  });
});

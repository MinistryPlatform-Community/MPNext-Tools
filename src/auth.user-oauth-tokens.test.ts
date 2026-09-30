// @vitest-environment node
// (node, not jsdom: better-auth verifies the id_token with `jose` over WebCrypto,
// which rejects jsdom-realm typed arrays.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';

/**
 * The user's own MP OAuth tokens are never used (all MP data access is the
 * client-credentials service account), so the app must not ask for a refresh
 * token, must not put the tokens in the browser (`account_data` cookie — see
 * src/auth.session-config.test.ts), and must not keep the access/refresh
 * tokens in the in-memory adapter. Security Step 3, playbook Phase 3.
 *
 * Signs in through the REAL `auth` instance with the full authorization-code
 * flow against a mock MP OIDC provider. `fetch` THROWS for any URL the mock
 * does not serve, so nothing here can reach a real Ministry Platform.
 */

const oidc = await vi.hoisted(async () =>
  (await import('@/test-utils/mock-oidc')).installMockOidc(),
);

import { auth, ministryPlatformProviderConfig, stripUserOAuthTokens } from '@/lib/auth';
import { codeFlow, type AuthLike } from '@/test-utils/mock-oidc';

const ORIGIN = 'http://localhost:3000';

/** The two members `signIn` needs, typed loosely so a rebuilt instance fits. */
type Instance = AuthLike & {
  api: { getSession: (a: { headers: Headers }) => Promise<{ user: { id: string; userGuid?: unknown } } | null> };
  $context: Promise<{ internalAdapter: { findAccounts: (userId: string) => Promise<Array<Record<string, unknown>>> } }>;
};

async function signIn(instance: Instance) {
  const { jar, authorizeUrl, location } = await codeFlow(instance, ORIGIN);
  expect(location).not.toMatch(/error/);
  const session = await instance.api.getSession({ headers: new Headers({ Cookie: jar.header() }) });
  expect(session?.user.userGuid).toBe(oidc.sub);
  const context = await instance.$context;
  const accounts = await context.internalAdapter.findAccounts(session!.user.id);
  return { authorizeUrl, jar, accounts };
}

beforeEach(() => {
  oidc.reset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('user MP OAuth tokens are not requested or retained', () => {
  it('does not request offline_access (no refresh token is ever needed)', async () => {
    expect(ministryPlatformProviderConfig.scopes).not.toContain('offline_access');
    const { authorizeUrl } = await signIn(auth as unknown as Instance);
    const scopes = authorizeUrl.searchParams.get('scope')!.split(' ');
    expect(scopes).toContain('openid');
    expect(scopes).not.toContain('offline_access');
  });

  it('keeps no access/refresh token in the in-memory account row, on first and repeat sign-in', async () => {
    for (let i = 0; i < 2; i++) {
      const { accounts } = await signIn(auth as unknown as Instance);
      expect(accounts).toHaveLength(1);
      const [account] = accounts;
      expect(account.accessToken ?? null).toBeNull();
      expect(account.refreshToken ?? null).toBeNull();
      expect(account.accessTokenExpiresAt ?? null).toBeNull();
      expect(account.refreshTokenExpiresAt ?? null).toBeNull();
      // Kept deliberately: not an API bearer; needed for a future
      // id_token_hint on MP logout (security Step 4). It lives ONLY in this
      // process's memory adapter — there is no cookie copy any more.
      expect(account.idToken).toBe(oidc.lastIdToken);
    }
  });

  it('negative control: without the databaseHooks, the memory adapter keeps both tokens', async () => {
    const unhooked = betterAuth({ ...auth.options, databaseHooks: {} });
    const { accounts } = await signIn(unhooked as unknown as Instance);
    expect(accounts[0].accessToken).toBe('mock-access-token');
    expect(accounts[0].refreshToken).toBe('mock-refresh-token');
  });
});

describe('the retained id_token is still reachable for logout (security Step 4)', () => {
  // Not used by the app yet: src/components/user-menu/actions.ts hand-builds
  // the endsession URL. This pins that dropping the account cookie did NOT
  // remove the id_token_hint source — on the instance that handled sign-in,
  // better-auth's own sign-out returns it from the in-memory row.
  it('sign-out on the same instance returns MP endsession with id_token_hint', async () => {
    const { jar } = await signIn(auth as unknown as Instance);
    const result = (await auth.api.signOut({
      headers: new Headers({ Cookie: jar.header() }),
      body: { disableRedirect: true },
    } as never)) as { url?: string };

    const url = new URL(result.url!);
    expect(`${url.origin}${url.pathname}`).toBe('https://test-mp.example.com/oauth/connect/endsession');
    expect(url.searchParams.get('id_token_hint')).toBe(oidc.lastIdToken);
  });
});

describe('stripUserOAuthTokens', () => {
  it('blanks the tokens and expiries and leaves everything else alone', () => {
    const input = {
      accountId: 'sub',
      providerId: 'ministryplatform',
      idToken: 'id',
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
    };
    expect(stripUserOAuthTokens(input)).toEqual({
      accountId: 'sub',
      providerId: 'ministryplatform',
      idToken: 'id',
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });
    expect(input.accessToken).toBe('a');
  });

  it('is wired as both the account create and update hook', async () => {
    const hooks = auth.options.databaseHooks!.account!;
    const row = { accessToken: 'a', refreshToken: 'r', idToken: 'i' };
    for (const hook of [hooks.create!.before!, hooks.update!.before!]) {
      const result = (await (hook as (a: object) => Promise<{ data: Record<string, unknown> }>)(row)).data;
      expect(result).toMatchObject({ accessToken: null, refreshToken: null, idToken: 'i' });
    }
  });
});

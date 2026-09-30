import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const { mockSignOut, mockRedirect } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signOut: mockSignOut,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { handleSignOut } from './actions';

/**
 * `handleSignOut` clears the app session, then sends the browser to MP's
 * end-session endpoint with `post_logout_redirect_uri` (exactly the registered
 * app origin), `client_id` (the OIDC sign-in client, always), and
 * `id_token_hint` when better-auth — on the process that still holds the
 * user's id_token — returned one on an MP-origin logout URL.
 */
describe('handleSignOut', () => {
  const originalEnv = process.env;

  /** The URL handleSignOut redirected to. */
  function redirectedTo(): URL {
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    return new URL(mockRedirect.mock.calls[0][0] as string);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.MINISTRY_PLATFORM_BASE_URL = 'https://mp.example.com';
    process.env.BETTER_AUTH_URL = 'https://myapp.example.com';
    process.env.MP_OIDC_CLIENT_ID = 'app-oidc-client';
    process.env.MP_OIDC_CLIENT_SECRET = 'app-oidc-secret';
    mockSignOut.mockResolvedValue({ success: true });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('clears the Better Auth session first, asking for the provider logout URL in the body', async () => {
    await handleSignOut();

    expect(mockSignOut).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      body: { disableRedirect: true },
    });
    expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(mockRedirect.mock.invocationCallOrder[0]);
  });

  it('redirects to MP end-session with post_logout_redirect_uri and the OIDC client_id', async () => {
    await handleSignOut();

    const url = redirectedTo();
    expect(`${url.origin}${url.pathname}`).toBe('https://mp.example.com/oauth/connect/endsession');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://myapp.example.com');
    expect(url.searchParams.get('client_id')).toBe('app-oidc-client');
    expect(url.searchParams.has('id_token_hint')).toBe(false);
  });

  it('adds the id_token_hint better-auth returned on this instance', async () => {
    mockSignOut.mockResolvedValueOnce({
      success: true,
      url: 'https://mp.example.com/oauth/connect/endsession?id_token_hint=the.id.token',
    });

    await handleSignOut();

    const url = redirectedTo();
    expect(url.searchParams.get('id_token_hint')).toBe('the.id.token');
    // Still rebuilt by us: exact registered redirect URI and client_id.
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://myapp.example.com');
    expect(url.searchParams.get('client_id')).toBe('app-oidc-client');
  });

  it.each([
    ['a different origin', 'https://evil.example/oauth/connect/endsession?id_token_hint=x'],
    ['an unparseable URL', 'not a url'],
    ['a non-string', 42],
    ['an empty hint', 'https://mp.example.com/oauth/connect/endsession?id_token_hint='],
  ])('ignores a logout URL on %s', async (_label, url) => {
    mockSignOut.mockResolvedValueOnce({ success: true, url });

    await handleSignOut();

    expect(redirectedTo().searchParams.has('id_token_hint')).toBe(false);
  });

  it('uses the service-account client id as client_id when no dedicated OIDC client is set (fallback)', async () => {
    delete process.env.MP_OIDC_CLIENT_ID;
    delete process.env.MP_OIDC_CLIENT_SECRET;
    process.env.MINISTRY_PLATFORM_CLIENT_ID = 'svc-client';
    process.env.MINISTRY_PLATFORM_CLIENT_SECRET = 'svc-secret';

    await handleSignOut();

    expect(redirectedTo().searchParams.get('client_id')).toBe('svc-client');
  });

  it('still clears the session, then throws, when MINISTRY_PLATFORM_BASE_URL is missing', async () => {
    delete process.env.MINISTRY_PLATFORM_BASE_URL;

    await expect(handleSignOut()).rejects.toThrow('MINISTRY_PLATFORM_BASE_URL is not set');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('throws when neither BETTER_AUTH_URL nor NEXTAUTH_URL is set', async () => {
    delete process.env.BETTER_AUTH_URL;
    delete process.env.NEXTAUTH_URL;

    await expect(handleSignOut()).rejects.toThrow('BETTER_AUTH_URL is not set (NEXTAUTH_URL is accepted as a fallback)');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('throws on half a dedicated OIDC client rather than send the wrong client_id', async () => {
    delete process.env.MP_OIDC_CLIENT_SECRET;

    await expect(handleSignOut()).rejects.toThrow(/must be set together/);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('falls back to NEXTAUTH_URL when BETTER_AUTH_URL is not set', async () => {
    delete process.env.BETTER_AUTH_URL;
    process.env.NEXTAUTH_URL = 'https://fallback.example.com';

    await handleSignOut();

    expect(redirectedTo().searchParams.get('post_logout_redirect_uri')).toBe('https://fallback.example.com');
  });

  it('refuses a non-https MP URL rather than redirecting the browser to it', async () => {
    process.env.MINISTRY_PLATFORM_BASE_URL = 'http://mp.example.com';

    await expect(handleSignOut()).rejects.toThrow('MINISTRY_PLATFORM_BASE_URL must use https://');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('normalizes a trailing slash, so the URL never contains //oauth', async () => {
    process.env.MINISTRY_PLATFORM_BASE_URL = 'https://mp.example.com/api/';
    process.env.BETTER_AUTH_URL = 'https://myapp.example.com/';

    await handleSignOut();

    expect(mockRedirect).toHaveBeenCalledWith(
      'https://mp.example.com/api/oauth/connect/endsession?post_logout_redirect_uri=https%3A%2F%2Fmyapp.example.com&client_id=app-oidc-client',
    );
  });
});

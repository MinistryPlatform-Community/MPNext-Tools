import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHandlerGet, mockHandlerPost } = vi.hoisted(() => ({
  mockHandlerGet: vi.fn(async () => new Response('ok', { status: 200 })),
  mockHandlerPost: vi.fn(async () => new Response('ok', { status: 200 })),
}));

vi.mock('@/lib/auth', () => ({
  auth: {},
}));

vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: () => ({ GET: mockHandlerGet, POST: mockHandlerPost }),
}));

import {
  GET,
  POST,
  allowedAuthRoutes,
  allowedSignInSocialKeys,
  authRoutePath,
  isAllowedAuthRoute,
  isAllowedSignInSocialBody,
  withNoStore,
  MAX_CALLBACK_URL_LENGTH,
  MAX_SIGN_IN_SOCIAL_BODY_BYTES,
  SIGN_IN_SOCIAL_PROVIDER,
} from './route';

const url = (path: string) => `https://tools.example.org${path}`;

/**
 * Deny-by-default tests for the Better Auth catch-all.
 *
 * Better Auth mounts ~30 HTTP endpoints here; this app's browser client calls
 * exactly three. The value of an allowlist is precisely that it also closes
 * endpoints a FUTURE Better Auth version adds, so the important assertions
 * below are the negative ones.
 */
describe('authRoutePath', () => {
  it('strips the /api/auth prefix', () => {
    expect(authRoutePath(url('/api/auth/get-session'))).toBe('/get-session');
  });

  it('collapses trailing slashes so they cannot slip past an exact match', () => {
    expect(authRoutePath(url('/api/auth/list-accounts/'))).toBe('/list-accounts');
    expect(authRoutePath(url('/api/auth/list-accounts///'))).toBe('/list-accounts');
  });

  it('ignores the query string', () => {
    expect(authRoutePath(url('/api/auth/get-session?x=1'))).toBe('/get-session');
  });
});

describe('isAllowedAuthRoute', () => {
  it('matches exactly — a prefix of an allowed route is not allowed', () => {
    expect(isAllowedAuthRoute('GET', url('/api/auth/get-session'))).toBe(true);
    expect(isAllowedAuthRoute('GET', url('/api/auth/get-session-extra'))).toBe(false);
    expect(isAllowedAuthRoute('GET', url('/api/auth/get-sessions'))).toBe(false);
  });

  it('is method-specific', () => {
    // /sign-in/social is a POST route; it must not be reachable via GET.
    expect(isAllowedAuthRoute('POST', url('/api/auth/sign-in/social'))).toBe(true);
    expect(isAllowedAuthRoute('GET', url('/api/auth/sign-in/social'))).toBe(false);
  });

  it('allows only the ministryplatform OAuth callback', () => {
    expect(isAllowedAuthRoute('GET', url('/api/auth/callback/ministryplatform'))).toBe(true);
    expect(isAllowedAuthRoute('GET', url('/api/auth/callback/github'))).toBe(false);
  });

  it('does not allow the Better Auth 1.6 endpoint paths, which no longer exist', () => {
    // 1.7 moved genericOAuth onto the core social endpoints. Keeping the old
    // paths allowlisted would leave dead entries that quietly drift.
    expect(isAllowedAuthRoute('POST', url('/api/auth/sign-in/oauth2'))).toBe(false);
    expect(
      isAllowedAuthRoute('GET', url('/api/auth/oauth2/callback/ministryplatform')),
    ).toBe(false);
  });
});

describe('catch-all handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes the three endpoints the client actually uses', async () => {
    await GET(new Request(url('/api/auth/get-session')));
    await GET(new Request(url('/api/auth/callback/ministryplatform')));
    await POST(
      new Request(url('/api/auth/sign-in/social'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ministryplatform', callbackURL: '/' }),
      }),
    );

    expect(mockHandlerGet).toHaveBeenCalledTimes(2);
    expect(mockHandlerPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    '/api/auth/update-user',
    '/api/auth/list-accounts',
    '/api/auth/link-social',
    '/api/auth/unlink-account',
    '/api/auth/get-access-token',
    '/api/auth/refresh-token',
    '/api/auth/account-info',
    '/api/auth/list-sessions',
    '/api/auth/revoke-sessions',
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
    '/api/auth/update-session',
    '/api/auth/oauth2/link',
    '/api/auth/ok',
    '/api/auth/error',
    '/api/auth/a-route-a-future-better-auth-version-adds',
  ])('404s %s without ever reaching Better Auth', async (path) => {
    const getRes = await GET(new Request(url(path)));
    const postRes = await POST(new Request(url(path), { method: 'POST' }));

    expect(getRes.status).toBe(404);
    expect(postRes.status).toBe(404);
    expect(mockHandlerGet).not.toHaveBeenCalled();
    expect(mockHandlerPost).not.toHaveBeenCalled();
  });

  it('NEGATIVE CONTROL: the same paths route once they are allowlisted', async () => {
    // Without this, the tests above would pass just as happily against a
    // handler that 404s everything, or one whose allowlist never matched.
    expect(isAllowedAuthRoute('POST', url('/api/auth/update-user'))).toBe(false);

    const widened = [...allowedAuthRoutes.POST, '/update-user'];
    expect(widened.includes('/update-user')).toBe(true);
    expect(authRoutePath(url('/api/auth/update-user'))).toBe('/update-user');
    // i.e. the refusal above comes from membership in the list, not from the
    // path failing to normalize.
  });

  it('does not expose sign-out over HTTP (it runs server-side via auth.api)', async () => {
    const res = await POST(new Request(url('/api/auth/sign-out'), { method: 'POST' }));
    expect(res.status).toBe(404);
  });
});

/**
 * F12, route layer — the `POST /sign-in/social` body filter.
 *
 * Tested here with Better Auth MOCKED OUT entirely (`toNextJsHandler` is a
 * stub), i.e. with the `refuseIdTokenSignIn` hook out of the way: every
 * refusal below comes from this filter alone. The assertion that matters is
 * that the handler is NEVER CALLED for a refused body — a 404 from Better Auth
 * itself would prove nothing about this layer.
 */
describe('POST /sign-in/social body filter', () => {
  const SIGN_IN = url('/api/auth/sign-in/social');

  function signIn(
    body: BodyInit | null,
    headers: Record<string, string> = { 'Content-Type': 'application/json' },
  ) {
    return new Request(SIGN_IN, { method: 'POST', headers, body });
  }

  function chunked(bytes: Uint8Array, chunkSize: number) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunkSize) {
          controller.enqueue(bytes.slice(i, i + chunkSize));
        }
        controller.close();
      },
    });
    return new Request(SIGN_IN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
  }

  const good = () =>
    JSON.stringify({ provider: 'ministryplatform', callbackURL: '/tools/addresslabels?s=1' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pins the key allowlist to exactly what the client sends', () => {
    expect([...allowedSignInSocialKeys]).toEqual(['provider', 'callbackURL']);
    expect(allowedSignInSocialKeys).not.toContain('idToken');
    // No hyphen: it is part of the redirect URI registered with MP.
    expect(SIGN_IN_SOCIAL_PROVIDER).toBe('ministryplatform');
  });

  it.each([
    ['application/json', good()],
    ['application/json; charset=utf-8', good()],
    ['Application/JSON;charset=UTF-8', good()],
    ['application/json', JSON.stringify({ provider: 'ministryplatform' })],
    // A BOM, stripped the way request.json() strips it.
    ['application/json', '﻿' + good()],
    [
      'application/json',
      JSON.stringify({
        provider: 'ministryplatform',
        callbackURL: '/' + 'a'.repeat(MAX_CALLBACK_URL_LENGTH - 1),
      }),
    ],
  ])('reaches Better Auth for Content-Type %j with an allowed body', async (contentType, body) => {
    const res = await POST(signIn(body, { 'Content-Type': contentType }));

    expect(res.status).toBe(200);
    expect(mockHandlerPost).toHaveBeenCalledTimes(1);
  });

  it('hands Better Auth an unconsumed body (the filter reads a clone)', async () => {
    mockHandlerPost.mockImplementationOnce(
      async (...args: unknown[]) => new Response(await (args[0] as Request).text()),
    );

    const res = await POST(signIn(good()));

    expect(await res.text()).toBe(good());
  });

  it.each([
    [
      'an idToken (the F12 takeover body)',
      JSON.stringify({ provider: 'ministryplatform', idToken: { token: 'x', accessToken: 'y' } }),
    ],
    ['idToken: null', JSON.stringify({ provider: 'ministryplatform', idToken: null })],
    ['idToken: {}', JSON.stringify({ provider: 'ministryplatform', idToken: {} })],
    ['scopes', JSON.stringify({ provider: 'ministryplatform', scopes: ['openid'] })],
    ['errorCallbackURL', JSON.stringify({ provider: 'ministryplatform', errorCallbackURL: '/x' })],
    ['newUserCallbackURL', JSON.stringify({ provider: 'ministryplatform', newUserCallbackURL: '/x' })],
    ['additionalParams', JSON.stringify({ provider: 'ministryplatform', additionalParams: { a: 'b' } })],
    ['additionalData', JSON.stringify({ provider: 'ministryplatform', additionalData: { a: 'b' } })],
    ['loginHint', JSON.stringify({ provider: 'ministryplatform', loginHint: 'x' })],
    ['requestSignUp', JSON.stringify({ provider: 'ministryplatform', requestSignUp: true })],
    ['disableRedirect', JSON.stringify({ provider: 'ministryplatform', disableRedirect: true })],
    ['__proto__ as an own key', '{"provider":"ministryplatform","__proto__":{"idToken":1}}'],
    ['a different provider', JSON.stringify({ provider: 'github', callbackURL: '/' })],
    [
      'the hyphenated upstream provider id',
      JSON.stringify({ provider: 'ministry-platform', callbackURL: '/' }),
    ],
    [
      'a duplicate provider whose LAST value is foreign (JSON.parse: last wins)',
      '{"provider":"ministryplatform","provider":"github"}',
    ],
    ['no provider', JSON.stringify({ callbackURL: '/' })],
    ['a non-string callbackURL', JSON.stringify({ provider: 'ministryplatform', callbackURL: 42 })],
    ['a null callbackURL', JSON.stringify({ provider: 'ministryplatform', callbackURL: null })],
    [
      'a 2049-character callbackURL',
      JSON.stringify({
        provider: 'ministryplatform',
        callbackURL: '/' + 'a'.repeat(MAX_CALLBACK_URL_LENGTH),
      }),
    ],
    ['malformed JSON', '{"provider":'],
    ['a JSON array', JSON.stringify(['provider', 'ministryplatform'])],
    ['JSON null', 'null'],
    ['a JSON string', '"ministryplatform"'],
    ['an empty body', ''],
  ])('refuses a body with %s: plain 404, Better Auth never called', async (_label, body) => {
    const res = await POST(signIn(body));

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(mockHandlerPost).not.toHaveBeenCalled();
  });

  it.each([
    ['text/plain', 'text/plain'],
    ['form-encoded', 'application/x-www-form-urlencoded'],
    ['multipart', 'multipart/form-data; boundary=x'],
    ['a +json suffix type', 'application/ld+json'],
    ['a comma-joined multi-value header', 'application/json, application/x-www-form-urlencoded'],
    ['a comma after the parameters', 'application/json; charset=utf-8, text/plain'],
    ['a longer media type sharing the prefix', 'application/jsonx'],
    ['a leading NBSP (JS trim() strips it; HTTP does not)', ' application/json'],
  ])('refuses Content-Type %s even with an allowed body', async (_label, contentType) => {
    const res = await POST(signIn(good(), { 'Content-Type': contentType }));

    expect(res.status).toBe(404);
    expect(mockHandlerPost).not.toHaveBeenCalled();
  });

  it('refuses a request with no Content-Type', async () => {
    const bare = new Request(SIGN_IN, { method: 'POST' });
    expect(bare.headers.get('content-type')).toBeNull();

    expect((await POST(bare)).status).toBe(404);
    expect(mockHandlerPost).not.toHaveBeenCalled();
  });

  it('refuses a declared Content-Length over the cap before cloning anything', async () => {
    const req = signIn(good(), {
      'Content-Type': 'application/json',
      'Content-Length': String(MAX_SIGN_IN_SOCIAL_BODY_BYTES + 1),
    });
    const cloneSpy = vi.spyOn(req, 'clone');

    expect(await isAllowedSignInSocialBody(req)).toBe(false);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it('refuses a non-numeric Content-Length', async () => {
    const req = signIn(good(), { 'Content-Type': 'application/json', 'Content-Length': '12abc' });
    expect(await isAllowedSignInSocialBody(req)).toBe(false);
  });

  it('refuses an oversized body that declares no length (chunked), without hanging', async () => {
    // Insignificant JSON whitespace as padding: the body is otherwise valid
    // and allowed, so ONLY the byte cap can refuse it.
    const big = `{"provider":"ministryplatform"${' '.repeat(MAX_SIGN_IN_SOCIAL_BODY_BYTES)}}`;
    expect(JSON.parse(big)).toEqual({ provider: 'ministryplatform' });
    const req = chunked(new TextEncoder().encode(big), 1000);
    expect(req.headers.get('content-length')).toBeNull();

    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(mockHandlerPost).not.toHaveBeenCalled();
  });

  it('accepts a chunked body under the cap', async () => {
    const req = chunked(new TextEncoder().encode(good()), 10);
    expect(await isAllowedSignInSocialBody(req)).toBe(true);
  });

  it('does not body-filter GET routes', async () => {
    const res = await GET(new Request(url('/api/auth/get-session')));
    expect(res.status).toBe(200);
    expect(mockHandlerGet).toHaveBeenCalledTimes(1);
  });
});

/**
 * Every response from the auth route is session-bearing or about the session,
 * so none may be cached — 404s included.
 */
describe('Cache-Control: no-store on every /api/auth response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets no-store on proxied GET and POST responses', async () => {
    const get = await GET(new Request(url('/api/auth/get-session')));
    const post = await POST(
      new Request(url('/api/auth/sign-in/social'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ministryplatform' }),
      }),
    );

    expect(get.headers.get('Cache-Control')).toBe('no-store');
    expect(post.headers.get('Cache-Control')).toBe('no-store');
  });

  it('overrides a cacheable header Better Auth might set', async () => {
    mockHandlerGet.mockResolvedValueOnce(
      new Response('ok', { headers: { 'Cache-Control': 'public, max-age=600' } }),
    );

    const res = await GET(new Request(url('/api/auth/get-session')));

    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sets no-store on non-allowlisted 404s', async () => {
    const get = await GET(new Request(url('/api/auth/list-accounts')));
    const post = await POST(new Request(url('/api/auth/update-user'), { method: 'POST' }));

    expect(get.headers.get('Cache-Control')).toBe('no-store');
    expect(post.headers.get('Cache-Control')).toBe('no-store');
  });

  it('copies a response with immutable headers (e.g. Response.redirect)', () => {
    const redirect = Response.redirect('https://tools.example.org/', 302);
    expect(() => redirect.headers.set('X-Probe', '1')).toThrow();

    const out = withNoStore(redirect);

    expect(out).not.toBe(redirect);
    expect(out.status).toBe(302);
    expect(out.headers.get('Location')).toBe('https://tools.example.org/');
    expect(out.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sets the header in place when it can, keeping Set-Cookie', () => {
    const res = new Response('x', { headers: { 'Set-Cookie': 'a=1' } });
    const out = withNoStore(res);
    expect(out).toBe(res);
    expect(out.headers.get('Cache-Control')).toBe('no-store');
    expect(out.headers.get('Set-Cookie')).toBe('a=1');
  });
});

/**
 * Test-only mock of Ministry Platform's OIDC provider, for driving the REAL
 * `auth.handler` from src/lib/auth.ts through the full authorization-code flow
 * (discovery, JWKS, token, userinfo), with id_tokens genuinely RS256-signed by
 * a key the mock JWKS publishes. Adapted from upstream MPNext's
 * `src/test-utils/mock-oidc.ts` for this fork (provider id `ministryplatform`,
 * boot-time `discoveryUrl`).
 *
 * `installMockOidc()` replaces `globalThis.fetch` with a stub that THROWS for
 * any URL it does not serve, so nothing that uses it can reach a real Ministry
 * Platform. This fork's genericOAuth config fetches discovery when the `auth`
 * instance initialises, so run it before `@/lib/auth` is imported, i.e. inside
 * `vi.hoisted`:
 *
 *   const oidc = await vi.hoisted(async () =>
 *     (await import('@/test-utils/mock-oidc')).installMockOidc());
 *
 * Use it from `// @vitest-environment node` suites: better-auth verifies the
 * id_token with `jose` over WebCrypto, which rejects jsdom-realm typed arrays.
 *
 * Not a test file itself; it is imported only by `src/auth.*.test.ts`.
 */
import { generateKeyPairSync, sign } from 'node:crypto';
import { expect } from 'vitest';

export const MOCK_MP_BASE = 'https://test-mp.example.com';
export const MOCK_ISSUER = `${MOCK_MP_BASE}/oauth`;
export const MOCK_CLIENT_ID = 'test-client-id';
export const MOCK_SUB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const MOCK_ACCESS_TOKEN = 'mock-access-token';
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token';
export const PROVIDER_ID = 'ministryplatform';

export interface RecordedCall {
  url: string;
  method: string;
  body: string;
}

export interface MockOidc {
  sub: string;
  /** Every request the mock served, in order. */
  calls: RecordedCall[];
  /** The id_token the token endpoint returned most recently. */
  lastIdToken: string | null;
  reset(): void;
}

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

export function installMockOidc(): MockOidc {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key-1', alg: 'RS256', use: 'sig' };

  const mock: MockOidc = {
    sub: MOCK_SUB,
    calls: [],
    lastIdToken: null,
    reset() {
      mock.calls.length = 0;
      mock.lastIdToken = null;
    },
  };

  function signIdToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const input = `${b64({ alg: 'RS256', kid: 'test-key-1', typ: 'JWT' })}.${b64({
      iss: MOCK_ISSUER,
      aud: MOCK_CLIENT_ID,
      sub: MOCK_SUB,
      iat: now,
      exp: now + 300,
    })}`;
    return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  }

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const { url, method } = request;
    mock.calls.push({ url, method, body: await request.clone().text() });

    if (url === `${MOCK_ISSUER}/.well-known/openid-configuration`) {
      return json({
        issuer: MOCK_ISSUER,
        authorization_endpoint: `${MOCK_ISSUER}/connect/authorize`,
        token_endpoint: `${MOCK_ISSUER}/connect/token`,
        userinfo_endpoint: `${MOCK_ISSUER}/connect/userinfo`,
        end_session_endpoint: `${MOCK_ISSUER}/connect/endsession`,
        jwks_uri: `${MOCK_ISSUER}/.well-known/openid-configuration/jwks`,
        id_token_signing_alg_values_supported: ['RS256'],
      });
    }
    if (url === `${MOCK_ISSUER}/.well-known/openid-configuration/jwks`) {
      return json({ keys: [jwk] });
    }
    if (url === `${MOCK_ISSUER}/connect/token` && method === 'POST') {
      mock.lastIdToken = signIdToken();
      // MP returns a refresh token when offline_access is granted; hand one
      // out regardless so the tests prove the app never stores it.
      return json({
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        id_token: mock.lastIdToken,
        token_type: 'Bearer',
        expires_in: 3600,
      });
    }
    if (url === `${MOCK_ISSUER}/connect/userinfo`) {
      return json({
        sub: MOCK_SUB,
        given_name: 'Code',
        family_name: 'Flow',
        email: 'code-flow-member@example.test',
      });
    }
    throw new Error(`Blocked unexpected fetch in test: ${method} ${url}`);
  }) as typeof fetch;

  return mock;
}

/** A minimal browser cookie jar: applies Set-Cookie (including deletions). */
export class CookieJar {
  readonly cookies = new Map<string, string>();

  constructor(from?: CookieJar) {
    if (from) for (const [k, v] of from.cookies) this.cookies.set(k, v);
  }

  apply(response: Response): this {
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=(0|-)/i.test(a));
      if (value === '' || expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return this;
  }

  /** The value of the one cookie whose name ends with `suffix`. */
  get(suffix: string): string | undefined {
    return [...this.cookies].find(([name]) => name.endsWith(suffix))?.[1];
  }

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

export interface AuthLike {
  handler: (request: Request) => Promise<Response>;
}

/** Starts sign-in; returns the jar (state cookie) and the authorize URL. */
export async function startSignIn(instance: AuthLike, origin: string) {
  const response = await instance.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ provider: PROVIDER_ID, callbackURL: '/' }),
    }),
  );
  expect(response.status).toBe(200);
  const jar = new CookieJar().apply(response);
  const { url } = (await response.json()) as { url: string };
  return { jar, authorizeUrl: new URL(url) };
}

/** The full authorization-code flow; returns the callback response and the updated jar. */
export async function codeFlow(instance: AuthLike, origin: string) {
  const { jar, authorizeUrl } = await startSignIn(instance, origin);
  const state = String(authorizeUrl.searchParams.get('state'));
  const response = await instance.handler(
    new Request(
      `${origin}/api/auth/callback/${PROVIDER_ID}?${new URLSearchParams({ code: 'test-code', state })}`,
      { headers: { Cookie: jar.header() } },
    ),
  );
  expect(response.status).toBe(302);
  jar.apply(response);
  return { response, jar, authorizeUrl, location: String(response.headers.get('location')) };
}

/** `GET /get-session`; returns the parsed body (null when signed out) and the response. */
export async function getSession(
  instance: AuthLike,
  origin: string,
  jar: CookieJar,
): Promise<{ user: Record<string, unknown>; session: Record<string, unknown> } | null> {
  const response = await instance.handler(
    new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: jar.header() } }),
  );
  expect(response.status).toBe(200);
  jar.apply(response);
  return (await response.json()) as { user: Record<string, unknown>; session: Record<string, unknown> } | null;
}

/** `POST /sign-out` with the jar's cookies; applies the deletions. */
export async function signOut(instance: AuthLike, origin: string, jar: CookieJar) {
  const response = await instance.handler(
    new Request(`${origin}/api/auth/sign-out`, {
      method: 'POST',
      headers: { Cookie: jar.header(), Origin: origin, 'Content-Type': 'application/json' },
      body: '{}',
    }),
  );
  expect(response.status).toBe(200);
  jar.apply(response);
  return response;
}

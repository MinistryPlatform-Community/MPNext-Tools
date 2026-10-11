import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MinistryPlatformClient } from '@/lib/providers/ministry-platform/client';

/**
 * MinistryPlatformClient Tests
 *
 * Tests for the core Ministry Platform client that handles:
 * - OAuth2 client credentials token management
 * - Automatic token refresh before expiration
 * - HTTP client configuration with token injection
 */

// Mock the client credentials module
vi.mock('@/lib/providers/ministry-platform/auth/client-credentials', () => ({
  getClientCredentialsToken: vi.fn(),
}));

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('MinistryPlatformClient', () => {
  let mockGetClientCredentialsToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const { getClientCredentialsToken } = await import(
      '@/lib/providers/ministry-platform/auth/client-credentials'
    );
    mockGetClientCredentialsToken = getClientCredentialsToken as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with base URL from environment', () => {
      const client = new MinistryPlatformClient();
      const httpClient = client.getHttpClient();

      // Verify HTTP client was created
      expect(httpClient).toBeDefined();
    });
  });

  describe('Token Management - ensureValidToken', () => {
    it('should fetch new token when no token exists (initial state)', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new MinistryPlatformClient();

      // Token should be fetched since expiresAt is initialized to epoch
      await client.ensureValidToken();

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should not fetch new token when token is still valid', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'valid-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new MinistryPlatformClient();

      // First call - should fetch token
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Advance time by 1 minute (still within 5-minute validity window)
      vi.advanceTimersByTime(60 * 1000);

      // Second call - should NOT fetch new token
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should refresh token when expired', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({
          access_token: 'first-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
        .mockResolvedValueOnce({
          access_token: 'refreshed-token',
          expires_in: 3600,
          token_type: 'Bearer',
        });

      const client = new MinistryPlatformClient();

      // First call - fetch initial token
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Advance time by 6 minutes (past the 5-minute token life)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second call - should fetch new token
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should throw error when token refresh fails', async () => {
      mockGetClientCredentialsToken.mockRejectedValueOnce(
        new Error('OAuth server unavailable')
      );

      const client = new MinistryPlatformClient();

      await expect(client.ensureValidToken()).rejects.toThrow('OAuth server unavailable');
    });

    it('should deduplicate concurrent ensureValidToken calls into a single token fetch', async () => {
      let resolveToken: (value: unknown) => void;
      const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
      });

      mockGetClientCredentialsToken.mockImplementation(() => tokenPromise);

      const client = new MinistryPlatformClient();

      // Start N concurrent callers — only one refresh should be in-flight
      const callers = Array.from({ length: 5 }, () => client.ensureValidToken());

      // Resolve the token
      resolveToken!({
        access_token: 'concurrent-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      await Promise.all(callers);

      // Deduplication: all N callers share the single in-flight refresh promise
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should allow a new refresh after the in-flight promise settles', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({
          access_token: 'first-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
        .mockResolvedValueOnce({
          access_token: 'second-token',
          expires_in: 3600,
          token_type: 'Bearer',
        });

      const client = new MinistryPlatformClient();

      // First refresh completes (in-flight promise clears)
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Expire token — a new refresh must be able to start
      vi.advanceTimersByTime(6 * 60 * 1000);

      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should clear the in-flight refresh promise when the underlying fetch rejects', async () => {
      mockGetClientCredentialsToken
        .mockRejectedValueOnce(new Error('transient failure'))
        .mockResolvedValueOnce({
          access_token: 'recovery-token',
          expires_in: 3600,
          token_type: 'Bearer',
        });

      const client = new MinistryPlatformClient();

      await expect(client.ensureValidToken()).rejects.toThrow('transient failure');

      // A subsequent call after failure must trigger a brand-new fetch (promise cleared in finally)
      // once the negative-cache window (at most 30 s) has passed
      vi.advanceTimersByTime(30 * 1000 + 1);
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Lifecycle', () => {
    it('should use 5-minute safety buffer for token expiration', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({
          access_token: 'token-1',
          expires_in: 3600,
          token_type: 'Bearer',
        })
        .mockResolvedValueOnce({
          access_token: 'token-2',
          expires_in: 3600,
          token_type: 'Bearer',
        });

      const client = new MinistryPlatformClient();

      // Fetch initial token
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Advance time by 4 minutes 59 seconds (just under 5-minute buffer)
      vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);

      // Should still be valid
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      // Advance time by 2 more seconds (past 5-minute buffer)
      vi.advanceTimersByTime(2000);

      // Should refresh now
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('HTTP Client', () => {
    it('should return the same HttpClient instance', () => {
      const client = new MinistryPlatformClient();

      const httpClient1 = client.getHttpClient();
      const httpClient2 = client.getHttpClient();

      expect(httpClient1).toBe(httpClient2);
    });

    it('should provide HttpClient with token getter', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'injected-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new MinistryPlatformClient();
      await client.ensureValidToken();

      const httpClient = client.getHttpClient();

      // The HttpClient should have access to the token via the getter
      // This is tested indirectly through the URL building
      expect(httpClient).toBeDefined();
      expect(typeof httpClient.buildUrl).toBe('function');
    });
  });

  describe('Dev Token Pipeline - ensureValidDevToken / getDevHttpClient', () => {
    it('should fetch dev token using the "dev" profile', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'dev-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new MinistryPlatformClient();
      await client.ensureValidDevToken();

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
      expect(mockGetClientCredentialsToken).toHaveBeenCalledWith('dev');
    });

    it('should return a dev HttpClient distinct from the default HttpClient', () => {
      const client = new MinistryPlatformClient();

      const defaultHttp = client.getHttpClient();
      const devHttp = client.getDevHttpClient();

      expect(devHttp).toBeDefined();
      expect(devHttp).not.toBe(defaultHttp);
    });

    it('should cache the dev token independently from the default token', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({ access_token: 'default-token', expires_in: 3600 })
        .mockResolvedValueOnce({ access_token: 'dev-token', expires_in: 3600 });

      const client = new MinistryPlatformClient();

      await client.ensureValidToken();
      await client.ensureValidDevToken();

      // Each pipeline fetched its own token — one default call, one dev call
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(1, 'default');
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(2, 'dev');

      // Calling ensureValidToken again should NOT trigger a dev fetch
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should not refresh the dev token while still valid', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'dev-token-1',
        expires_in: 3600,
      });

      const client = new MinistryPlatformClient();
      await client.ensureValidDevToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60 * 1000);

      await client.ensureValidDevToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should refresh the dev token after expiration', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({ access_token: 'dev-token-1', expires_in: 3600 })
        .mockResolvedValueOnce({ access_token: 'dev-token-2', expires_in: 3600 });

      const client = new MinistryPlatformClient();
      await client.ensureValidDevToken();
      vi.advanceTimersByTime(6 * 60 * 1000);

      await client.ensureValidDevToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(1, 'dev');
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(2, 'dev');
    });

    it('should deduplicate concurrent ensureValidDevToken calls into a single fetch', async () => {
      let resolveDev: (value: unknown) => void;
      const devPromise = new Promise((resolve) => {
        resolveDev = resolve;
      });
      mockGetClientCredentialsToken.mockImplementation(() => devPromise);

      const client = new MinistryPlatformClient();

      const callers = Array.from({ length: 4 }, () => client.ensureValidDevToken());

      resolveDev!({
        access_token: 'dev-concurrent-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      await Promise.all(callers);

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
      expect(mockGetClientCredentialsToken).toHaveBeenCalledWith('dev');
    });

    it('should propagate errors from dev token refresh', async () => {
      mockGetClientCredentialsToken.mockRejectedValueOnce(
        new Error('Dev client credentials are not configured')
      );

      const client = new MinistryPlatformClient();

      await expect(client.ensureValidDevToken()).rejects.toThrow(
        'Dev client credentials are not configured'
      );
    });

    it('should not populate the default token when refreshing the dev token', async () => {
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'dev-only',
        expires_in: 3600,
      });

      const client = new MinistryPlatformClient();
      await client.ensureValidDevToken();

      // Default pipeline must still consider itself expired
      mockGetClientCredentialsToken.mockResolvedValueOnce({
        access_token: 'default-fetched-after',
        expires_in: 3600,
      });
      await client.ensureValidToken();

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(1, 'dev');
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(2, 'default');
    });
  });

  describe('Error Handling', () => {
    it('should propagate network errors from token refresh', async () => {
      mockGetClientCredentialsToken.mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const client = new MinistryPlatformClient();

      await expect(client.ensureValidToken()).rejects.toThrow('Failed to fetch');
    });

    it('should propagate authentication errors', async () => {
      mockGetClientCredentialsToken.mockRejectedValueOnce(
        new Error('invalid_client: Client authentication failed')
      );

      const client = new MinistryPlatformClient();

      await expect(client.ensureValidToken()).rejects.toThrow(
        'invalid_client: Client authentication failed'
      );
    });

    it('should allow retry after failed token refresh', async () => {
      mockGetClientCredentialsToken
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          access_token: 'retry-success-token',
          expires_in: 3600,
          token_type: 'Bearer',
        });

      const client = new MinistryPlatformClient();

      // First attempt fails
      await expect(client.ensureValidToken()).rejects.toThrow('Temporary error');

      // Once the negative-cache window (at most 30 s) has passed, a retry succeeds
      vi.advanceTimersByTime(30 * 1000 + 1);
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should log only the error name on refresh failure, never its message', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetClientCredentialsToken.mockRejectedValueOnce(
        new Error('Unexpected token "Jane Doe, "... is not valid JSON')
      );

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidToken()).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]).toEqual([
        '[MP]',
        'mp.token.refresh_failed',
        { profile: 'default', error: 'Error' },
      ]);
    });
  });

  describe('Single-flight refresh and negative cache', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should make one token request for 50 concurrent cold calls', async () => {
      let resolveToken: (value: unknown) => void;
      mockGetClientCredentialsToken.mockImplementation(
        () => new Promise((resolve) => { resolveToken = resolve; })
      );

      const client = new MinistryPlatformClient();
      const calls = Array.from({ length: 50 }, () => client.ensureValidToken());

      resolveToken!({ access_token: 'shared-token', token_type: 'Bearer', expires_in: 3600 });
      await Promise.all(calls);

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should share one failed refresh across concurrent callers', async () => {
      let rejectToken: (reason: unknown) => void;
      mockGetClientCredentialsToken.mockImplementation(
        () => new Promise((_, reject) => { rejectToken = reject; })
      );

      const client = new MinistryPlatformClient();
      const calls = Array.from({ length: 20 }, () => client.ensureValidToken());

      rejectToken!(new Error('503'));
      const results = await Promise.allSettled(calls);

      expect(results.every((r) => r.status === 'rejected')).toBe(true);
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);
    });

    it('should fail fast without a token request inside the jittered window', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // 5 s + 12.5 s = 17.5 s
      mockGetClientCredentialsToken
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ access_token: 'back', token_type: 'Bearer', expires_in: 3600 });

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidToken()).rejects.toThrow('down');

      vi.advanceTimersByTime(17 * 1000);
      await expect(client.ensureValidToken()).rejects.toThrow(
        'MP access token unavailable: recent refresh failed'
      );
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should hold failures for at least 5 s even with zero jitter', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      mockGetClientCredentialsToken.mockRejectedValue(new Error('down'));

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidToken()).rejects.toThrow('down');

      vi.advanceTimersByTime(4999);
      await expect(client.ensureValidToken()).rejects.toThrow('recent refresh failed');

      vi.advanceTimersByTime(2);
      await expect(client.ensureValidToken()).rejects.toThrow('down');
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should clear the negative cache after a successful refresh', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      mockGetClientCredentialsToken
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ access_token: 'a', token_type: 'Bearer', expires_in: 60 })
        .mockResolvedValueOnce({ access_token: 'b', token_type: 'Bearer', expires_in: 60 });

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidToken()).rejects.toThrow('down');
      vi.advanceTimersByTime(5001);
      await client.ensureValidToken();

      // Token 'a' lives 5 min; the next refresh must not be blocked by the old failure
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(3);
    });
  });

  describe('401 handling through the HttpClient', () => {
    const originalEnv = { ...process.env };
    let fetchMock: ReturnType<typeof vi.fn>;

    const jsonHeaders = { get: (n: string) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) };
    const ok = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', headers: jsonHeaders, json: () => Promise.resolve(body) });
    const unauthorized = () => ({ ok: false, status: 401, statusText: 'Unauthorized', headers: jsonHeaders, json: vi.fn() });
    const authHeader = (call: number) => fetchMock.mock.calls[call][1].headers.Authorization;

    beforeEach(() => {
      process.env.MINISTRY_PLATFORM_BASE_URL = 'https://mp.example.org/ministryplatformapi';
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({ access_token: 'revoked', token_type: 'Bearer', expires_in: 3600 })
        .mockResolvedValueOnce({ access_token: 'fresh', token_type: 'Bearer', expires_in: 3600 });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      process.env = { ...originalEnv };
    });

    it('should invalidate the token, refresh once, and retry once', async () => {
      fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok([{ Contact_ID: 1 }]));

      const client = new MinistryPlatformClient();
      await client.ensureValidToken();
      const result = await client.getHttpClient().get('/tables/Contacts');

      expect(result).toEqual([{ Contact_ID: 1 }]);
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(authHeader(0)).toBe('Bearer revoked');
      expect(authHeader(1)).toBe('Bearer fresh');
    });

    it('should not loop when the retry is also rejected', async () => {
      fetchMock.mockResolvedValue(unauthorized());

      const client = new MinistryPlatformClient();
      await client.ensureValidToken();

      await expect(client.getHttpClient().get('/tables/Contacts')).rejects.toThrow(
        'GET /tables/Contacts failed: 401 Unauthorized'
      );
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should refresh once for a burst of 401s on the same stale token', async () => {
      fetchMock
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValue(ok([]));

      const client = new MinistryPlatformClient();
      await client.ensureValidToken();
      const http = client.getHttpClient();
      await Promise.all([http.get('/tables/A'), http.get('/tables/B')]);

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should not invalidate a token that was already replaced', async () => {
      fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValue(ok([]));

      const client = new MinistryPlatformClient();
      await client.ensureValidToken(); // 'revoked'
      await client.getHttpClient().get('/tables/A'); // 401 -> now 'fresh'

      // A late 401 for 'revoked' arriving after 'fresh' is in place is a no-op
      const pipeline = (client as unknown as { main: { handleUnauthorized: (t: string) => Promise<void> } }).main;
      const handler = pipeline.handleUnauthorized.bind(pipeline);
      await handler('revoked');

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });

    it('should surface the 401 when the refresh itself fails', async () => {
      mockGetClientCredentialsToken.mockReset();
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({ access_token: 'revoked', token_type: 'Bearer', expires_in: 3600 })
        .mockRejectedValueOnce(new Error('token endpoint down'));
      fetchMock.mockResolvedValue(unauthorized());

      const client = new MinistryPlatformClient();
      await client.ensureValidToken();

      await expect(client.getHttpClient().get('/tables/Contacts')).rejects.toThrow(
        'GET /tables/Contacts failed: 401 Unauthorized'
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Secret handling on token-refresh failure', () => {
    const originalEnv = { ...process.env };
    const SECRET = 'super-secret-client-secret-value';

    afterEach(() => {
      vi.unstubAllGlobals();
      process.env = { ...originalEnv };
    });

    it('should never pass the client secret to console.error', async () => {
      // Exercise the real token function behind the mock, with a token
      // endpoint that rejects the request
      const actual = await vi.importActual<
        typeof import('@/lib/providers/ministry-platform/auth/client-credentials')
      >('@/lib/providers/ministry-platform/auth/client-credentials');
      mockGetClientCredentialsToken.mockImplementation(actual.getClientCredentialsToken);

      process.env.MINISTRY_PLATFORM_BASE_URL = 'https://mp.example.org/ministryplatformapi';
      process.env.MINISTRY_PLATFORM_CLIENT_ID = 'client-id';
      process.env.MINISTRY_PLATFORM_CLIENT_SECRET = SECRET;

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized', json: vi.fn() })
        .mockRejectedValueOnce(new TypeError(`fetch failed (body: client_secret=${SECRET})`));
      vi.stubGlobal('fetch', fetchMock);

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidToken()).rejects.toThrow();
      vi.advanceTimersByTime(31 * 1000);
      await expect(client.ensureValidToken()).rejects.toThrow();

      // The secret really was sent, so its absence from the logs is meaningful
      expect(String(fetchMock.mock.calls[0][1].body)).toContain(SECRET);
      expect(errorSpy).toHaveBeenCalledTimes(2);
      for (const args of errorSpy.mock.calls) {
        const logged = args
          .map((a) => (a instanceof Error ? `${a.name} ${a.message} ${String(a.cause)}` : JSON.stringify(a)))
          .join(' ');
        expect(logged).not.toContain(SECRET);
      }
    });
  });

  describe('Dev pipeline isolation (401 retry and negative cache)', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    const jsonHeaders = { get: (n: string) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) };

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should refresh the DEV token (not the default one) on a dev 401', async () => {
      mockGetClientCredentialsToken
        .mockResolvedValueOnce({ access_token: 'dev-revoked', token_type: 'Bearer' })
        .mockResolvedValueOnce({ access_token: 'dev-fresh', token_type: 'Bearer' });
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized', headers: jsonHeaders })
        .mockResolvedValueOnce({ ok: true, status: 200, headers: jsonHeaders, json: () => Promise.resolve([[]]) });

      const client = new MinistryPlatformClient();
      await client.ensureValidDevToken();
      await expect(client.getDevHttpClient().get('/procs/api_dev_X')).resolves.toEqual([[]]);

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(1, 'dev');
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(2, 'dev');
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer dev-fresh');
    });

    it('should not let a failed dev refresh put the default pipeline in backoff', async () => {
      mockGetClientCredentialsToken
        .mockRejectedValueOnce(new Error('Dev client credentials are not configured'))
        .mockResolvedValueOnce({ access_token: 'default-ok', token_type: 'Bearer' });

      const client = new MinistryPlatformClient();
      await expect(client.ensureValidDevToken()).rejects.toThrow('not configured');
      await expect(client.ensureValidToken()).resolves.toBeUndefined();
      await expect(client.ensureValidDevToken()).rejects.toThrow('recent refresh failed');

      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledWith('[MP]', 'mp.token.refresh_failed', {
        profile: 'dev',
        error: 'Error',
      });
    });
  });
});

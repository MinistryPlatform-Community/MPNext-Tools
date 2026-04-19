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
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(1);
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
      expect(mockGetClientCredentialsToken).toHaveBeenNthCalledWith(2);
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

      // Second attempt succeeds
      await client.ensureValidToken();
      expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
    });
  });
});

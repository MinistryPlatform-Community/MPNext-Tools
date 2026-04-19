import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Proxy Tests
 *
 * Tests for the authentication proxy in src/proxy.ts
 * These tests verify route protection behavior including:
 * - Public path access (API routes, signin)
 * - Session cookie validation
 * - Redirect behavior for unauthenticated users
 * - Error handling during session checks
 * - Route matcher configuration
 */

const { mockGetSessionCookie } = vi.hoisted(() => ({
  mockGetSessionCookie: vi.fn(),
}));

vi.mock('better-auth/cookies', () => ({
  getSessionCookie: mockGetSessionCookie,
}));

// Mock NextResponse since next/server may not work in test env
const { mockNext, mockRedirect } = vi.hoisted(() => ({
  mockNext: vi.fn((init?: { request?: { headers?: Headers } }) => ({
    type: 'next',
    headers: init?.request?.headers,
  })),
  mockRedirect: vi.fn((url: URL) => ({ type: 'redirect', url })),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: mockNext,
    redirect: mockRedirect,
  },
  NextRequest: vi.fn(),
}));

import { proxy, config } from './proxy';

function createMockRequest(pathname: string, baseUrl = 'http://localhost:3000') {
  const url = new URL(pathname, baseUrl);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public Paths', () => {
    it('should allow /api paths without session check', async () => {
      const request = createMockRequest('/api/auth/session');

      await proxy(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockGetSessionCookie).not.toHaveBeenCalled();
    });

    it('should allow nested /api/auth paths without session check', async () => {
      const request = createMockRequest('/api/auth/callback/ministry-platform');

      await proxy(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockGetSessionCookie).not.toHaveBeenCalled();
    });

    it('should gate non-auth /api paths (e.g. /api/other) behind the session check', async () => {
      const request = createMockRequest('/api/other');
      mockGetSessionCookie.mockReturnValueOnce(null);

      await proxy(request);

      expect(mockGetSessionCookie).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/signin' })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow /signin path without session check', async () => {
      const request = createMockRequest('/signin');

      await proxy(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockGetSessionCookie).not.toHaveBeenCalled();
    });
  });

  describe('Protected Paths', () => {
    it('should redirect to /signin when no session cookie', async () => {
      const request = createMockRequest('/home');
      mockGetSessionCookie.mockReturnValueOnce(null);

      await proxy(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/signin' })
      );
    });

    it('should include callbackUrl when redirecting to /signin', async () => {
      const request = createMockRequest('/tools/template?recordID=123&pageID=456');
      mockGetSessionCookie.mockReturnValueOnce(null);

      await proxy(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/signin');
      expect(redirectUrl.searchParams.get('callbackUrl')).toBe('/tools/template?recordID=123&pageID=456');
    });

    it('should include callbackUrl without query string for simple paths', async () => {
      const request = createMockRequest('/home');
      mockGetSessionCookie.mockReturnValueOnce(null);

      await proxy(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.searchParams.get('callbackUrl')).toBe('/home');
    });

    it('should allow request when session cookie exists', async () => {
      const request = createMockRequest('/home');
      mockGetSessionCookie.mockReturnValueOnce('session-token-value');

      await proxy(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect to /signin on error during session check', async () => {
      const request = createMockRequest('/home');
      mockGetSessionCookie.mockImplementationOnce(() => {
        throw new Error('Cookie parsing error');
      });

      await proxy(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/signin' })
      );
    });

    it('should include callbackUrl on error redirect', async () => {
      const request = createMockRequest('/tools/template?recordID=789');
      mockGetSessionCookie.mockImplementationOnce(() => {
        throw new Error('Cookie parsing error');
      });

      await proxy(request);

      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/signin');
      expect(redirectUrl.searchParams.get('callbackUrl')).toBe('/tools/template?recordID=789');
    });
  });

  describe('x-pathname forwarding', () => {
    it('should forward x-pathname header on public paths', async () => {
      const request = createMockRequest('/api/auth/session?x=1');

      await proxy(request);

      const init = mockNext.mock.calls[0][0] as { request?: { headers?: Headers } };
      expect(init?.request?.headers?.get('x-pathname')).toBe('/api/auth/session?x=1');
    });

    it('should forward x-pathname header when session cookie exists', async () => {
      const request = createMockRequest('/tools/addresslabels?s=123&pageID=456');
      mockGetSessionCookie.mockReturnValueOnce('session-token-value');

      await proxy(request);

      const init = mockNext.mock.calls[0][0] as { request?: { headers?: Headers } };
      expect(init?.request?.headers?.get('x-pathname')).toBe(
        '/tools/addresslabels?s=123&pageID=456'
      );
    });

    it('should not set x-pathname when redirecting (only next() passes headers)', async () => {
      const request = createMockRequest('/tools/template?s=1');
      mockGetSessionCookie.mockReturnValueOnce(null);

      await proxy(request);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalled();
    });
  });

  describe('Route Matcher', () => {
    it('should export config with correct matcher pattern', () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toHaveLength(1);
    });

    it('should exclude _next/static, _next/image, favicon.ico, and assets paths', () => {
      const pattern = config.matcher[0];
      expect(pattern).toContain('_next/static');
      expect(pattern).toContain('_next/image');
      expect(pattern).toContain('favicon.ico');
      expect(pattern).toContain('assets/');
    });
  });
});

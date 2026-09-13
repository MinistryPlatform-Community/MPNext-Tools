import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { requireDevSession } from './require-dev-session';

const validSession = {
  user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
};

/**
 * This is a documented authorization carve-out (CLAUDE.md rule 12): the
 * dev panel is gated on NODE_ENV + a valid session here, and the services
 * it calls perform their own `AuthorizationService.requireSecurityRole`
 * gate. Both the allow and deny paths are exercised below.
 */
describe('requireDevSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws in production before checking the session at all', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(requireDevSession('Deploy Tool')).rejects.toThrow(
      'Deploy Tool is not available in production.'
    );
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('uses the default feature label "Dev panel" in the production error', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(requireDevSession()).rejects.toThrow(
      'Dev panel is not available in production.'
    );
  });

  it('throws Unauthorized when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(requireDevSession()).rejects.toThrow(
      'Unauthorized - Missing user session data'
    );
  });

  it('throws Unauthorized when session has no user id', async () => {
    mockGetSession.mockResolvedValueOnce({ user: {} });

    await expect(requireDevSession()).rejects.toThrow(
      'Unauthorized - Missing user session data'
    );
  });

  it('returns the session when NODE_ENV is not production and a session exists', async () => {
    mockGetSession.mockResolvedValueOnce(validSession);

    const result = await requireDevSession();

    expect(result).toEqual(validSession);
  });

  it('allows non-production, non-development NODE_ENV values (e.g. test)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mockGetSession.mockResolvedValueOnce(validSession);

    const result = await requireDevSession('Dev panel');

    expect(result).toEqual(validSession);
  });
});

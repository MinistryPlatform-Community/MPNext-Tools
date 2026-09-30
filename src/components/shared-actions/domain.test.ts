import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetMpTimezone, mockGetInstance } = vi.hoisted(() => {
  const getTz = vi.fn();
  return {
    mockGetMpTimezone: getTz,
    mockGetInstance: vi.fn(() => ({ getMpTimezone: getTz })),
  };
});

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/domainTimezoneService', () => ({
  DomainTimezoneService: {
    getInstance: mockGetInstance,
  },
}));

import { getMpTimezone } from './domain';

/**
 * This action is one of the documented authorization carve-outs in CLAUDE.md
 * rule 12: it returns a single domain-wide configuration string (the IANA
 * time zone) and exposes no per-record data, so it is not ROLE-gated — but it
 * does require a session (F11), since a server action is a POST endpoint.
 */

describe('getMpTimezone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'ba-1' } });
  });

  it.each([
    ['no session', null],
    ['a session with no user', {}],
    ['a user with no id', { user: {} }],
  ])('REFUSES with %s and never touches MP (F11)', async (_label, session) => {
    // Adversarial: before F11 this action had no check at all and answered
    // an unauthenticated POST.
    mockGetSession.mockResolvedValueOnce(session);

    await expect(getMpTimezone()).rejects.toThrow('Authentication required');
    expect(mockGetInstance).not.toHaveBeenCalled();
    expect(mockGetMpTimezone).not.toHaveBeenCalled();
  });

  it('returns the IANA zone from DomainTimezoneService', async () => {
    mockGetMpTimezone.mockResolvedValueOnce('America/New_York');

    await expect(getMpTimezone()).resolves.toBe('America/New_York');
  });

  it('resolves the service through its singleton accessor', async () => {
    mockGetMpTimezone.mockResolvedValueOnce('UTC');

    await getMpTimezone();

    expect(mockGetInstance).toHaveBeenCalledTimes(1);
    expect(mockGetMpTimezone).toHaveBeenCalledTimes(1);
  });

  it('propagates a lookup failure to the caller', async () => {
    mockGetMpTimezone.mockRejectedValueOnce(new Error('domain lookup failed'));

    await expect(getMpTimezone()).rejects.toThrow('domain lookup failed');
  });
});

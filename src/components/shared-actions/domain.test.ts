import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetMpTimezone, mockGetInstance } = vi.hoisted(() => {
  const getTz = vi.fn();
  return {
    mockGetMpTimezone: getTz,
    mockGetInstance: vi.fn(() => ({ getMpTimezone: getTz })),
  };
});

vi.mock('@/services/domainTimezoneService', () => ({
  DomainTimezoneService: {
    getInstance: mockGetInstance,
  },
}));

import { getMpTimezone } from './domain';

/**
 * This action is one of the documented authorization carve-outs in CLAUDE.md
 * rule 12: it returns a single domain-wide configuration string (the IANA
 * time zone) and exposes no per-record data, so it is deliberately ungated.
 */

describe('getMpTimezone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

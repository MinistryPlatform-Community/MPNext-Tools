import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindCollisions = vi.hoisted(() => vi.fn());

const mockRequireSecurityRole = vi.hoisted(() => vi.fn());
vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: { getInstance: () => ({ requireSecurityRole: mockRequireSecurityRole }) },
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message = 'Not authorized') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
}));
vi.mock('@/services/messagingCollisionService', () => ({
  MessagingCollisionService: {
    getInstance: vi.fn().mockResolvedValue({ findCollisions: mockFindCollisions }),
  },
}));

import { UnauthorizedError } from '@/services/authorizationService';
import { checkMessagingCollisions } from './actions';

const emptyResult = {
  sendAt: '2026-09-17T18:00:00.000Z',
  windowStart: '2026-09-17T06:00:00.000Z',
  windowEnd: '2026-09-18T06:00:00.000Z',
  lookbackHours: 12,
  lookaheadHours: 12,
  largeSendThreshold: 1000,
  plannedIsLarge: false,
  collisions: [],
  truncatedCount: 0,
  overlapChecked: false,
};

describe('checkMessagingCollisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
    mockFindCollisions.mockResolvedValue(emptyResult);
  });

  it('rejects a caller without a security role', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new UnauthorizedError());
    const response = await checkMessagingCollisions({ recipientCount: 5 });
    expect(response).toEqual({ success: false, error: 'Not authorized' });
    expect(mockFindCollisions).not.toHaveBeenCalled();
  });

  it('passes a parsed planned instant, cleaned IDs, and known channels to the service', async () => {
    const response = await checkMessagingCollisions({
      recipientCount: 1200.7,
      sendAt: '2026-09-17T18:00:00.000Z',
      recipientContactIds: [3, 3, 0, -1, 4.9, Number.NaN],
      excludeCommunicationId: 77,
      channels: ['sms', 'carrier-pigeon' as never],
    });
    expect(response.success).toBe(true);
    expect(mockFindCollisions).toHaveBeenCalledWith({
      sendAt: new Date('2026-09-17T18:00:00.000Z'),
      recipientCount: 1200,
      recipientContactIds: [3, 4],
      excludeCommunicationId: 77,
      channels: ['sms'],
    });
  });

  it('uses now and the default channels when the caller sends neither', async () => {
    const before = Date.now();
    await checkMessagingCollisions({ recipientCount: 5 });
    const call = mockFindCollisions.mock.calls[0][0];
    expect(call.sendAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(call.channels).toBeUndefined();
    expect(call.excludeCommunicationId).toBeUndefined();
    expect(call.recipientContactIds).toEqual([]);
  });

  it('rejects an unparseable planned time and a negative count', async () => {
    expect(await checkMessagingCollisions({ recipientCount: 5, sendAt: 'tomorrow-ish' })).toEqual({
      success: false,
      error: 'The planned send time is not valid.',
    });
    expect(await checkMessagingCollisions({ recipientCount: -1 })).toEqual({
      success: false,
      error: 'Recipient count is not valid.',
    });
  });

  it('surfaces service errors as a failed result', async () => {
    mockFindCollisions.mockRejectedValueOnce(new Error('MP is down'));
    expect(await checkMessagingCollisions({ recipientCount: 5 })).toEqual({ success: false, error: 'MP is down' });
  });
});

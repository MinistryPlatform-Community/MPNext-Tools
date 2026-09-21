import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { MessagingCollisionResult } from '@/lib/dto';

const mockCheck = vi.hoisted(() => vi.fn());
vi.mock('./actions', () => ({ checkMessagingCollisions: mockCheck }));

import { useMessagingCollisions, type UseMessagingCollisionsOptions } from './use-messaging-collisions';

const emptyResult: MessagingCollisionResult = {
  sendAt: '2026-09-17T18:00:00.000Z',
  windowStart: '2026-09-17T06:00:00.000Z',
  windowEnd: '2026-09-18T06:00:00.000Z',
  lookbackHours: 12,
  lookaheadHours: 12,
  largeSendThreshold: 1000,
  highImpactThreshold: 10000,
  criticalHours: 2,
  segmentsPerSecond: 5,
  emailsPerSecond: 5,
  plannedDeliveryMinutes: null,
  plannedQueueDelayMinutes: null,
  plannedIsLarge: false,
  collisions: [],
  truncatedCount: 0,
  overlapChecked: false,
};

function options(overrides: Partial<UseMessagingCollisionsOptions> = {}): UseMessagingCollisionsOptions {
  return { enabled: true, recipientCount: 50, sendAt: null, debounceMs: 0, ...overrides };
}

describe('useMessagingCollisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockResolvedValue({ success: true, result: emptyResult });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not check while disabled and clears state', async () => {
    const { result, rerender } = renderHook((props: UseMessagingCollisionsOptions) => useMessagingCollisions(props), {
      initialProps: options(),
    });
    await waitFor(() => expect(result.current.result).toEqual(emptyResult));
    rerender(options({ enabled: false }));
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  it('sends the planned instant keyed to the minute and forwards the other inputs', async () => {
    const sendAt = new Date('2026-09-17T18:00:42.500Z');
    const ids = [3, 1, 2];
    const { result } = renderHook(() =>
      useMessagingCollisions(
        options({
          sendAt,
          recipientContactIds: ids,
          excludeCommunicationId: 900,
          channels: ['email', 'sms'],
          plannedChannel: 'sms',
          plannedSegments: 2,
        })
      )
    );
    await waitFor(() => expect(result.current.result).toEqual(emptyResult));
    expect(mockCheck).toHaveBeenCalledWith({
      recipientCount: 50,
      sendAt: '2026-09-17T18:00:00.000Z',
      recipientContactIds: ids,
      excludeCommunicationId: 900,
      channels: ['email', 'sms'],
      plannedChannel: 'sms',
      plannedSegments: 2,
    });
    expect(result.current.loading).toBe(false);
  });

  it('omits sendAt for a right-away send', async () => {
    const { result } = renderHook(() => useMessagingCollisions(options({ sendAt: null })));
    await waitFor(() => expect(result.current.result).toEqual(emptyResult));
    expect(mockCheck.mock.calls[0][0].sendAt).toBeUndefined();
  });

  it('surfaces a failed check as an error with no result', async () => {
    mockCheck.mockResolvedValueOnce({ success: false, error: 'Recipient count is not valid.' });
    const { result } = renderHook(() => useMessagingCollisions(options()));
    await waitFor(() => expect(result.current.error).toBe('Recipient count is not valid.'));
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('ignores a slow earlier response once a newer check has started', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const slow = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockCheck.mockReturnValueOnce(slow);
    const second = { ...emptyResult, truncatedCount: 7 };
    mockCheck.mockResolvedValueOnce({ success: true, result: second });

    const { result, rerender } = renderHook((props: UseMessagingCollisionsOptions) => useMessagingCollisions(props), {
      initialProps: options({ recipientCount: 10 }),
    });
    await waitFor(() => expect(mockCheck).toHaveBeenCalledTimes(1));
    rerender(options({ recipientCount: 20 }));
    await waitFor(() => expect(result.current.result).toEqual(second));

    await act(async () => {
      resolveFirst({ success: true, result: { ...emptyResult, truncatedCount: 99 } });
    });
    expect(result.current.result).toEqual(second);
  });

  it('re-checks on refresh without any input change, and debounces rapid changes', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook((props: UseMessagingCollisionsOptions) => useMessagingCollisions(props), {
      initialProps: options({ debounceMs: 500, recipientCount: 1 }),
    });
    rerender(options({ debounceMs: 500, recipientCount: 2 }));
    rerender(options({ debounceMs: 500, recipientCount: 3 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockCheck.mock.calls[0][0].recipientCount).toBe(3);

    act(() => result.current.refresh());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockCheck).toHaveBeenCalledTimes(2);
  });

  it('does not re-check when the same contact ids arrive as a new array', async () => {
    const { result, rerender } = renderHook((props: UseMessagingCollisionsOptions) => useMessagingCollisions(props), {
      initialProps: options({ recipientContactIds: [1, 2] }),
    });
    await waitFor(() => expect(result.current.result).toEqual(emptyResult));
    rerender(options({ recipientContactIds: [1, 2] }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });
});

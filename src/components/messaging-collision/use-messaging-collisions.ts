'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessagingChannel, MessagingCollisionResult } from '@/lib/dto';
import { checkMessagingCollisions } from './actions';

export interface UseMessagingCollisionsOptions {
  /** False skips the check and clears any previous result (e.g. no recipients yet). */
  enabled: boolean;
  recipientCount: number;
  /** Planned recipients, for overlap counts. Pass a stable reference between resolves. */
  recipientContactIds?: number[];
  /** Planned send instant; null means "right away" and lets the server use its clock. */
  sendAt: Date | null;
  excludeCommunicationId?: number;
  channels?: MessagingChannel[];
  /** Channel of the planned send; 'sms' turns on delivery-queue estimates. */
  plannedChannel?: MessagingChannel;
  /** Segments per recipient of the planned text, for the queue estimate. */
  plannedSegments?: number;
  /** Delay before a change triggers a check, so a scrubbing time picker does not fire per tick. */
  debounceMs?: number;
}

export interface UseMessagingCollisionsState {
  result: MessagingCollisionResult | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the check immediately. */
  refresh: () => void;
}

/**
 * Runs the collision check whenever the recipients or planned time change, debounced,
 * with a request counter so a slow earlier response never overwrites a newer one.
 * The planned instant is keyed to the minute, so a ticking clock does not re-check.
 */
export function useMessagingCollisions(options: UseMessagingCollisionsOptions): UseMessagingCollisionsState {
  const {
    enabled,
    recipientCount,
    recipientContactIds,
    sendAt,
    excludeCommunicationId,
    channels,
    plannedChannel,
    plannedSegments,
    debounceMs = 500,
  } = options;
  const [result, setResult] = useState<MessagingCollisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const sendAtKey = sendAt ? Math.floor(sendAt.getTime() / 60_000) : null;
  const contactKey = useMemo(() => (recipientContactIds ? recipientContactIds.join(',') : ''), [recipientContactIds]);
  const channelKey = channels?.join(',') ?? '';

  useEffect(() => {
    if (!enabled) {
      requestRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }
    const requestId = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const response = await checkMessagingCollisions({
        recipientCount,
        sendAt: sendAtKey !== null ? new Date(sendAtKey * 60_000).toISOString() : undefined,
        recipientContactIds,
        excludeCommunicationId,
        channels,
        plannedChannel,
        plannedSegments,
      });
      if (requestId !== requestRef.current) return;
      if (response.success) {
        setResult(response.result);
      } else {
        setResult(null);
        setError(response.error);
      }
      setLoading(false);
    }, debounceMs);
    return () => clearTimeout(timer);
    // contactKey and channelKey stand in for their arrays so a re-created array with the
    // same contents does not re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    recipientCount,
    sendAtKey,
    contactKey,
    excludeCommunicationId,
    channelKey,
    plannedChannel,
    plannedSegments,
    debounceMs,
    refreshTick,
  ]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return { result, loading, error, refresh };
}

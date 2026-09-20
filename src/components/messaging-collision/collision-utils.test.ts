import { describe, it, expect } from 'vitest';
import type { MessagingCollision, MessagingCollisionResult } from '@/lib/dto';
import {
  channelLabel,
  describeDelay,
  describeOffset,
  describeTiming,
  describeWindow,
  formatCollisionTime,
  formatHours,
  formatMinutes,
  partitionCollisions,
  summarizeCollisions,
} from './collision-utils';

function collision(overrides: Partial<MessagingCollision> = {}): MessagingCollision {
  return {
    communicationId: 1,
    subject: 'Hi',
    channel: 'email',
    channelLabel: 'Email',
    statusLabel: 'Sent',
    isPending: false,
    startAt: '2026-09-17T16:04:00.000Z',
    hoursFromSendAt: -2,
    authorName: null,
    fromLabel: null,
    recipientCount: 1500,
    isLarge: true,
    isHighImpact: false,
    isCritical: true,
    estimatedSegments: null,
    estimatedDeliveryMinutes: null,
    queueDelayMinutes: null,
    interferes: false,
    overlapCount: null,
    ...overrides,
  };
}

function result(overrides: Partial<MessagingCollisionResult> = {}): MessagingCollisionResult {
  return {
    sendAt: '2026-09-17T18:00:00.000Z',
    windowStart: '2026-09-17T06:00:00.000Z',
    windowEnd: '2026-09-18T06:00:00.000Z',
    lookbackHours: 12,
    lookaheadHours: 12,
    largeSendThreshold: 1000,
    highImpactThreshold: 10000,
    criticalHours: 2,
    segmentsPerSecond: 3,
    emailsPerSecond: 4,
    plannedDeliveryMinutes: null,
    plannedQueueDelayMinutes: null,
    plannedIsLarge: false,
    collisions: [],
    truncatedCount: 0,
    overlapChecked: false,
    ...overrides,
  };
}

describe('formatHours', () => {
  it('uses minutes under an hour and drops trailing zeros', () => {
    expect(formatHours(0.5)).toBe('30 minutes');
    expect(formatHours(-0.02)).toBe('1 minute');
    expect(formatHours(1)).toBe('1 hour');
    expect(formatHours(1.5)).toBe('1.5 hours');
    expect(formatHours(12)).toBe('12 hours');
  });
});

describe('formatMinutes', () => {
  it('rounds to whole minutes and rolls into hours', () => {
    expect(formatMinutes(0.4)).toBe('~1 min');
    expect(formatMinutes(12.4)).toBe('~12 min');
    expect(formatMinutes(60)).toBe('~1 hr');
    expect(formatMinutes(65)).toBe('~1 hr 5 min');
  });
});

describe('describeOffset', () => {
  it('treats anything within 15 minutes as the same time', () => {
    expect(describeOffset(0.1)).toBe('at about the same time');
    expect(describeOffset(-0.2)).toBe('at about the same time');
  });

  it('says before or after', () => {
    expect(describeOffset(-2)).toBe('2 hours before');
    expect(describeOffset(0.75)).toBe('45 minutes after');
  });
});

describe('describeTiming', () => {
  it('picks the verb from pending state and direction', () => {
    expect(describeTiming({ hoursFromSendAt: -3, isPending: false })).toBe('Sent 3 hours before');
    expect(describeTiming({ hoursFromSendAt: -0.3, isPending: true })).toBe('Queued 18 minutes before');
    expect(describeTiming({ hoursFromSendAt: 0.1, isPending: true })).toBe('Scheduled at about the same time');
    expect(describeTiming({ hoursFromSendAt: 2, isPending: true })).toBe('Scheduled 2 hours after');
  });
});

describe('describeDelay', () => {
  it('is null when the sends do not queue against each other', () => {
    expect(describeDelay({ hoursFromSendAt: -1, interferes: false, queueDelayMinutes: 0 })).toBeNull();
    expect(describeDelay({ hoursFromSendAt: -1, interferes: true, queueDelayMinutes: null })).toBeNull();
  });

  it('phrases the direction of the delay', () => {
    expect(describeDelay({ hoursFromSendAt: -0.3, interferes: true, queueDelayMinutes: 12 }, 'text')).toBe(
      'May delay this text ~12 min'
    );
    expect(describeDelay({ hoursFromSendAt: 0.5, interferes: true, queueDelayMinutes: 5 })).toBe('May be delayed ~5 min');
  });
});

describe('formatCollisionTime', () => {
  it('formats in the given zone', () => {
    expect(formatCollisionTime('2026-09-17T16:04:00.000Z', 'America/Phoenix')).toBe('Thu, Sep 17 at 9:04 AM');
  });

  it('returns an empty string for junk', () => {
    expect(formatCollisionTime('nope', 'America/Phoenix')).toBe('');
  });
});

describe('describeWindow', () => {
  it('collapses a symmetric window', () => {
    expect(describeWindow({ lookbackHours: 12, lookaheadHours: 12 })).toBe('12 hours');
    expect(describeWindow({ lookbackHours: 12, lookaheadHours: 6 })).toBe('12 hours before or 6 hours after');
  });
});

describe('channelLabel', () => {
  it('uses plain words for email and text', () => {
    expect(channelLabel({ channel: 'email', channelLabel: 'Email' })).toBe('Email');
    expect(channelLabel({ channel: 'sms', channelLabel: 'SMS Text' })).toBe('Text');
    expect(channelLabel({ channel: 'other', channelLabel: 'RSS Feed' })).toBe('RSS Feed');
  });
});

describe('partitionCollisions', () => {
  it('splits on the planned time with the earliest first on each side', () => {
    const groups = partitionCollisions([
      collision({ communicationId: 1, hoursFromSendAt: -5, startAt: '2026-09-17T13:00:00.000Z' }),
      collision({ communicationId: 2, hoursFromSendAt: 3, startAt: '2026-09-17T21:00:00.000Z' }),
      collision({ communicationId: 3, hoursFromSendAt: 0, startAt: '2026-09-17T18:00:00.000Z' }),
      collision({ communicationId: 4, hoursFromSendAt: 0.5, startAt: '2026-09-17T18:30:00.000Z' }),
      collision({ communicationId: 5, hoursFromSendAt: -1, startAt: '2026-09-17T17:00:00.000Z' }),
    ]);
    expect(groups.before.map((c) => c.communicationId)).toEqual([1, 5, 3]);
    expect(groups.after.map((c) => c.communicationId)).toEqual([4, 2]);
  });
});

describe('summarizeCollisions', () => {
  it('is quiet with nothing found', () => {
    expect(summarizeCollisions(result())).toEqual(
      expect.objectContaining({
        level: 'none',
        headline: 'No other large messages within 12 hours.',
        total: 0,
        maxOverlap: null,
      })
    );
  });

  it('is a notice when nothing would queue and nothing is high impact', () => {
    const summary = summarizeCollisions(result({ collisions: [collision({ hoursFromSendAt: -6 })] }), 'text');
    expect(summary.level).toBe('notice');
    expect(summary.headline).toBe('1 other message within 12 hours.');
    expect(summary.interferingCount).toBe(0);
  });

  it('leads with the planned start delay when the queue is busy ahead of it', () => {
    const summary = summarizeCollisions(
      result({
        plannedQueueDelayMinutes: 7,
        truncatedCount: 2,
        overlapChecked: true,
        collisions: [
          collision({
            communicationId: 1,
            channel: 'sms',
            isPending: true,
            isLarge: false,
            recipientCount: 900,
            interferes: true,
            queueDelayMinutes: 7,
            overlapCount: 7,
          }),
          collision({ communicationId: 2, hoursFromSendAt: 5, isHighImpact: true, recipientCount: 12000, overlapCount: 300 }),
        ],
      }),
      'text'
    );
    expect(summary.level).toBe('warning');
    expect(summary.total).toBe(4);
    expect(summary.headline).toBe(
      '4 other messages within 12 hours. This text may start ~7 min late. 1 to more than 10,000 people.'
    );
    expect(summary.maxOverlap).toBe(300);
    expect(summary.pendingCount).toBe(1);
    expect(summary.highImpactCount).toBe(1);
  });

  it('counts later messages the planned send would push back when it starts on time', () => {
    const summary = summarizeCollisions(
      result({
        plannedQueueDelayMinutes: 0,
        collisions: [
          collision({ communicationId: 1, channel: 'email', hoursFromSendAt: 0.2, isPending: true, interferes: true, queueDelayMinutes: 9 }),
        ],
      }),
      'text'
    );
    expect(summary.level).toBe('warning');
    expect(summary.headline).toBe('1 other message within 12 hours. 1 may be delayed by this text.');
  });
});

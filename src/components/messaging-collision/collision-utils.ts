/**
 * Pure helpers for presenting a `MessagingCollisionResult`: relative timing copy,
 * zoned timestamps, the before/after split, and the one-line summary tools show
 * near their send button. No DOM, no MP, safe on client and server.
 */

import type { MessagingCollision, MessagingCollisionResult } from '@/lib/dto';

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralWord}`;
}

/** Hours as "45 minutes", "1 hour", "1.5 hours", "3 hours". */
export function formatHours(hours: number): string {
  const abs = Math.abs(hours);
  if (abs < 1) {
    const minutes = Math.max(1, Math.round(abs * 60));
    return plural(minutes, 'minute');
  }
  const rounded = Math.round(abs * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toLocaleString() : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? 'hour' : 'hours'}`;
}

/** Whole minutes as "~12 min" or "~1 hr 5 min". */
export function formatMinutes(minutes: number): string {
  const whole = Math.max(1, Math.round(minutes));
  if (whole < 60) return `~${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `~${hours} hr` : `~${hours} hr ${rest} min`;
}

/**
 * Signed hours from the planned send as copy: "at about the same time",
 * "2 hours before", "45 minutes after".
 */
export function describeOffset(hoursFromSendAt: number): string {
  if (Math.abs(hoursFromSendAt) < 0.25) return 'at about the same time';
  return `${formatHours(hoursFromSendAt)} ${hoursFromSendAt < 0 ? 'before' : 'after'}`;
}

/**
 * What happened (or will happen) and when, relative to the planned send:
 * "Sent 3 hours before", "Queued 18 minutes before", "Scheduled 2 hours after".
 */
export function describeTiming(collision: Pick<MessagingCollision, 'hoursFromSendAt' | 'isPending'>): string {
  const verb = !collision.isPending ? 'Sent' : collision.hoursFromSendAt > 0 ? 'Scheduled' : 'Queued';
  return `${verb} ${describeOffset(collision.hoursFromSendAt)}`;
}

/**
 * The queueing consequence, or null when the two sends would not wait on each other:
 * "May delay this text ~12 min" for an earlier message, "May be delayed ~5 min" for a later one.
 */
export function describeDelay(
  collision: Pick<MessagingCollision, 'hoursFromSendAt' | 'interferes' | 'queueDelayMinutes'>,
  sendNoun = 'message'
): string | null {
  if (!collision.interferes || collision.queueDelayMinutes === null) return null;
  const amount = formatMinutes(collision.queueDelayMinutes);
  return collision.hoursFromSendAt <= 0 ? `May delay this ${sendNoun} ${amount}` : `May be delayed ${amount}`;
}

/** "Thu, Sep 17 at 9:04 AM" for an ISO instant in `timeZone`. */
export function formatCollisionTime(isoInstant: string, timeZone: string): string {
  const instant = new Date(isoInstant);
  if (Number.isNaN(instant.getTime())) return '';
  const date = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(
    instant
  );
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(instant);
  return `${date} at ${time}`;
}

/** "12 hours" when symmetric, otherwise "12 hours before or 6 hours after". */
export function describeWindow(result: Pick<MessagingCollisionResult, 'lookbackHours' | 'lookaheadHours'>): string {
  if (result.lookbackHours === result.lookaheadHours) return formatHours(result.lookbackHours);
  return `${formatHours(result.lookbackHours)} before or ${formatHours(result.lookaheadHours)} after`;
}

/** Plain label for a collision's channel. */
export function channelLabel(collision: Pick<MessagingCollision, 'channel' | 'channelLabel'>): string {
  if (collision.channel === 'email') return 'Email';
  if (collision.channel === 'sms') return 'Text';
  return collision.channelLabel || 'Message';
}

export interface CollisionGroups {
  /** Start before or with the planned send. Earliest first. */
  before: MessagingCollision[];
  /** Start after the planned send. Earliest first. */
  after: MessagingCollision[];
}

/** Splits collisions by which side of the planned send they land on, in start order. */
export function partitionCollisions(collisions: MessagingCollision[]): CollisionGroups {
  const byStart = (a: MessagingCollision, b: MessagingCollision) => a.startAt.localeCompare(b.startAt);
  return {
    before: collisions.filter((c) => c.hoursFromSendAt <= 0).sort(byStart),
    after: collisions.filter((c) => c.hoursFromSendAt > 0).sort(byStart),
  };
}

/**
 * `none`: nothing nearby. `notice`: other messages in the window, none that would
 * queue against this send and none high impact. `warning`: at least one would.
 * The messaging worker is one serial queue for email and text, so the planned send's
 * own start delay (`plannedQueueDelayMinutes`) is the headline fact when it exists.
 */
export type CollisionLevel = 'none' | 'notice' | 'warning';

export interface CollisionSummary {
  level: CollisionLevel;
  /** One or two short sentences of facts for the panel header or a confirm dialog. */
  headline: string;
  /** Total collisions found, including any beyond the returned cap. */
  total: number;
  /** Returned collisions that would queue against this send. */
  interferingCount: number;
  /** Returned collisions over the high-impact threshold. */
  highImpactCount: number;
  /** Returned collisions the platform has not sent yet. */
  pendingCount: number;
  /** Highest overlap with the planned recipients, or null when overlap was not counted. */
  maxOverlap: number | null;
}

/** Condenses a result into the level and sentence tools show. */
export function summarizeCollisions(result: MessagingCollisionResult, sendNoun = 'message'): CollisionSummary {
  const total = result.collisions.length + result.truncatedCount;
  const window = describeWindow(result);
  const interferingCount = result.collisions.filter((c) => c.interferes).length;
  const highImpactCount = result.collisions.filter((c) => c.isHighImpact).length;
  const pendingCount = result.collisions.filter((c) => c.isPending).length;
  const overlaps = result.collisions.map((c) => c.overlapCount).filter((n): n is number => n !== null);
  const maxOverlap = result.overlapChecked && overlaps.length > 0 ? Math.max(...overlaps) : null;
  const base = { total, interferingCount, highImpactCount, pendingCount, maxOverlap };

  if (total === 0) {
    return { ...base, level: 'none', headline: `No other large messages within ${window}.` };
  }

  const parts = [`${plural(total, 'other message')} within ${window}.`];
  if (result.plannedQueueDelayMinutes !== null && result.plannedQueueDelayMinutes >= 1) {
    parts.push(`This ${sendNoun} may start ${formatMinutes(result.plannedQueueDelayMinutes)} late.`);
  } else if (interferingCount > 0) {
    parts.push(`${interferingCount.toLocaleString()} may be delayed by this ${sendNoun}.`);
  }
  if (highImpactCount > 0) {
    parts.push(
      `${highImpactCount.toLocaleString()} to more than ${result.highImpactThreshold.toLocaleString()} people.`
    );
  }
  return {
    ...base,
    level: interferingCount > 0 || highImpactCount > 0 ? 'warning' : 'notice',
    headline: parts.join(' '),
  };
}

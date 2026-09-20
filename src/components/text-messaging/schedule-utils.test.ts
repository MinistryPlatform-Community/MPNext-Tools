import { describe, it, expect } from 'vitest';
import {
  formatZonedDateTime,
  formatZonedTime,
  instantToZonedWallClock,
  sameZonedDay,
  timeZoneAbbreviation,
  zonedWallClockToInstant,
} from './schedule-utils';

describe('zonedWallClockToInstant', () => {
  it('reads the wall clock in a zone without DST (Arizona)', () => {
    const instant = zonedWallClockToInstant('2026-09-17T09:00', 'America/Phoenix');
    expect(instant?.toISOString()).toBe('2026-09-17T16:00:00.000Z');
  });

  it('applies the DST offset in a zone that observes it', () => {
    expect(zonedWallClockToInstant('2026-07-01T09:00', 'America/New_York')?.toISOString()).toBe(
      '2026-07-01T13:00:00.000Z'
    );
    expect(zonedWallClockToInstant('2026-01-15T09:00', 'America/New_York')?.toISOString()).toBe(
      '2026-01-15T14:00:00.000Z'
    );
  });

  it('accepts seconds and rejects malformed or impossible values', () => {
    expect(zonedWallClockToInstant('2026-09-17T09:00:30', 'Etc/UTC')?.toISOString()).toBe(
      '2026-09-17T09:00:30.000Z'
    );
    expect(zonedWallClockToInstant('', 'America/Phoenix')).toBeNull();
    expect(zonedWallClockToInstant('2026-09-17', 'America/Phoenix')).toBeNull();
    expect(zonedWallClockToInstant('2026-13-01T09:00', 'America/Phoenix')).toBeNull();
    expect(zonedWallClockToInstant('2026-09-17T25:00', 'America/Phoenix')).toBeNull();
  });

  it('round-trips through instantToZonedWallClock', () => {
    const local = '2026-11-01T01:30';
    const instant = zonedWallClockToInstant(local, 'America/Phoenix')!;
    expect(instantToZonedWallClock(instant, 'America/Phoenix')).toBe(local);
  });
});

describe('formatting', () => {
  const instant = new Date('2026-09-17T16:04:00.000Z');

  it('formats in the requested zone, not the runtime zone', () => {
    expect(formatZonedTime(instant, 'America/Phoenix')).toBe('9:04 AM');
    expect(formatZonedTime(instant, 'America/New_York')).toBe('12:04 PM');
    expect(formatZonedDateTime(instant, 'America/Phoenix')).toBe('Thu, Sep 17 at 9:04 AM');
  });

  it('abbreviates the zone', () => {
    expect(timeZoneAbbreviation('America/Phoenix', instant)).toBe('MST');
    expect(timeZoneAbbreviation('America/New_York', instant)).toBe('EDT');
  });

  it('compares calendar days in the zone', () => {
    const lateEvening = new Date('2026-09-18T05:30:00.000Z'); // 10:30 PM Sep 17 in Phoenix
    expect(sameZonedDay(instant, lateEvening, 'America/Phoenix')).toBe(true);
    expect(sameZonedDay(instant, lateEvening, 'Etc/UTC')).toBe(false);
  });
});

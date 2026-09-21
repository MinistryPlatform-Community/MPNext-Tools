import { describe, it, expect } from 'vitest';
import {
  curfewTimeToMinutes,
  minutesOfDayInZone,
  isInstantInCurfew,
  evaluateCurfew,
  formatCurfewTime,
  formatCurfewWindow,
} from './curfew-utils';
import type { MessageCurfewWindow } from '@/lib/dto';

const ZONE = 'America/Phoenix'; // no DST, fixed UTC-7
const OVERNIGHT: MessageCurfewWindow = { start: '19:00', end: '08:00' };

/** An instant that reads as the given Phoenix wall-clock time (UTC-7, no DST). */
function phoenix(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 8, 17, hour + 7, minute));
}

describe('curfewTimeToMinutes', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(curfewTimeToMinutes('19:00')).toBe(19 * 60);
    expect(curfewTimeToMinutes('08:30:00')).toBe(8 * 60 + 30);
    expect(curfewTimeToMinutes('0:05')).toBe(5);
  });

  it('rejects invalid values', () => {
    expect(curfewTimeToMinutes('')).toBeNull();
    expect(curfewTimeToMinutes('24:00')).toBeNull();
    expect(curfewTimeToMinutes('19:60')).toBeNull();
    expect(curfewTimeToMinutes('nope')).toBeNull();
  });
});

describe('minutesOfDayInZone', () => {
  it('reads wall-clock minutes in the target zone', () => {
    expect(minutesOfDayInZone(phoenix(21, 15), ZONE)).toBe(21 * 60 + 15);
    expect(minutesOfDayInZone(phoenix(0, 0), ZONE)).toBe(0);
  });
});

describe('isInstantInCurfew (overnight window 19:00 to 08:00)', () => {
  it('is inside late at night and early morning', () => {
    expect(isInstantInCurfew(phoenix(19, 0), ZONE, OVERNIGHT)).toBe(true); // start boundary
    expect(isInstantInCurfew(phoenix(23, 30), ZONE, OVERNIGHT)).toBe(true);
    expect(isInstantInCurfew(phoenix(2, 0), ZONE, OVERNIGHT)).toBe(true);
    expect(isInstantInCurfew(phoenix(7, 59), ZONE, OVERNIGHT)).toBe(true);
  });

  it('is outside during the day', () => {
    expect(isInstantInCurfew(phoenix(8, 0), ZONE, OVERNIGHT)).toBe(false); // end boundary excluded
    expect(isInstantInCurfew(phoenix(12, 0), ZONE, OVERNIGHT)).toBe(false);
    expect(isInstantInCurfew(phoenix(18, 59), ZONE, OVERNIGHT)).toBe(false);
  });
});

describe('isInstantInCurfew (same-day window 12:00 to 13:00)', () => {
  const noon: MessageCurfewWindow = { start: '12:00', end: '13:00' };
  it('is inside only within the window', () => {
    expect(isInstantInCurfew(phoenix(12, 30), ZONE, noon)).toBe(true);
    expect(isInstantInCurfew(phoenix(11, 59), ZONE, noon)).toBe(false);
    expect(isInstantInCurfew(phoenix(13, 0), ZONE, noon)).toBe(false);
  });
});

describe('isInstantInCurfew (zero-length window)', () => {
  it('treats start === end as no curfew', () => {
    expect(isInstantInCurfew(phoenix(3, 0), ZONE, { start: '08:00', end: '08:00' })).toBe(false);
  });
});

describe('evaluateCurfew', () => {
  it('is all-false with no curfew', () => {
    expect(
      evaluateCurfew({ curfew: null, timeZone: ZONE, startInstant: phoenix(21), completionSeconds: 60 })
    ).toEqual({ startInCurfew: false, endInCurfew: false, inCurfew: false });
  });

  it('is all-false with no start instant', () => {
    expect(
      evaluateCurfew({ curfew: OVERNIGHT, timeZone: ZONE, startInstant: null, completionSeconds: 60 })
    ).toEqual({ startInCurfew: false, endInCurfew: false, inCurfew: false });
  });

  it('flags a scheduled start inside quiet hours', () => {
    const result = evaluateCurfew({
      curfew: OVERNIGHT,
      timeZone: ZONE,
      startInstant: phoenix(20, 0),
      completionSeconds: 60,
    });
    expect(result).toEqual({ startInCurfew: true, endInCurfew: true, inCurfew: true });
  });

  it('flags a daytime send whose completion crosses into quiet hours', () => {
    // Starts 18:30, runs 2 hours -> finishes 20:30 (inside curfew).
    const result = evaluateCurfew({
      curfew: OVERNIGHT,
      timeZone: ZONE,
      startInstant: phoenix(18, 30),
      completionSeconds: 2 * 60 * 60,
    });
    expect(result.startInCurfew).toBe(false);
    expect(result.endInCurfew).toBe(true);
    expect(result.inCurfew).toBe(true);
  });

  it('is clear for a daytime send that finishes before quiet hours', () => {
    const result = evaluateCurfew({
      curfew: OVERNIGHT,
      timeZone: ZONE,
      startInstant: phoenix(10, 0),
      completionSeconds: 30 * 60,
    });
    expect(result.inCurfew).toBe(false);
  });
});

describe('formatting', () => {
  it('formats a 12-hour time', () => {
    expect(formatCurfewTime('19:00')).toBe('7:00 PM');
    expect(formatCurfewTime('08:00')).toBe('8:00 AM');
    expect(formatCurfewTime('00:00')).toBe('12:00 AM');
    expect(formatCurfewTime('12:30')).toBe('12:30 PM');
  });

  it('formats the window without an emdash', () => {
    expect(formatCurfewWindow(OVERNIGHT)).toBe('7:00 PM to 8:00 AM');
  });
});

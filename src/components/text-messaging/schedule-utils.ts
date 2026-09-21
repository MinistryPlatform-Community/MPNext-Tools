/**
 * Client-side helpers for scheduling a text in the Ministry Platform domain's time
 * zone. MP stores `Start_Date` as a wall-clock value in that zone, so the picker works
 * in zone wall-clock strings ("YYYY-MM-DDTHH:MM") and only converts to instants for
 * arithmetic (past checks, completion estimates). Pure functions, no DOM, no MP.
 */

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function parseWallClock(value: string): WallClockParts | null {
  const match = value.trim().match(WALL_CLOCK);
  if (!match) return null;
  const [, y, mo, d, h, mi, s = '00'] = match;
  const parts = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s),
  };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null;
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return null;
  return parts;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function zonedParts(instant: Date, timeZone: string): WallClockParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: lookup.hour === '24' ? 0 : Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function utcFromParts(p: WallClockParts): number {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Converts a `datetime-local` value read as wall-clock time in `timeZone` into an
 * instant. Returns null for anything that is not "YYYY-MM-DDTHH:MM[:SS]".
 */
export function zonedWallClockToInstant(wallClock: string, timeZone: string): Date | null {
  const parts = parseWallClock(wallClock);
  if (!parts) return null;
  const guess = utcFromParts(parts);
  const projected = utcFromParts(zonedParts(new Date(guess), timeZone));
  const offset = guess - projected;
  return new Date(guess + offset);
}

/** The `datetime-local` value ("YYYY-MM-DDTHH:MM") for `instant` in `timeZone`. */
export function instantToZonedWallClock(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Short zone label for the picker, e.g. "MST" for America/Phoenix. */
export function timeZoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? timeZone;
}

/** "Thu, Sep 17 at 9:04 AM" in `timeZone`. */
export function formatZonedDateTime(instant: Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(instant);
  return `${date} at ${formatZonedTime(instant, timeZone)}`;
}

/** "9:04 AM" in `timeZone`. */
export function formatZonedTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(instant);
}

/** True when the two instants fall on the same calendar day in `timeZone`. */
export function sameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  const pa = zonedParts(a, timeZone);
  const pb = zonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

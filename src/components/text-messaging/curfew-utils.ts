/**
 * Client-safe helpers for the messaging curfew (quiet hours). MP stores the curfew as
 * two wall-clock "HH:MM" times in the domain's time zone (`Message_Curfew_Start_Time` /
 * `Message_Curfew_End_Time`), usually wrapping overnight (e.g. 19:00 to 08:00). These
 * pure functions decide whether a send's start or estimated completion instant falls
 * inside that window, so the form can warn and require an override. No DOM, no MP.
 */

import type { MessageCurfewWindow } from '@/lib/dto';

/** Parses "HH:MM" (or "HH:MM:SS") into minutes past midnight, or null when invalid. */
export function curfewTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** The wall-clock minutes past midnight for `instant` in `timeZone`. */
export function minutesOfDayInZone(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  const hour = lookup.hour === '24' ? 0 : Number(lookup.hour);
  const minute = Number(lookup.minute);
  return hour * 60 + minute;
}

/**
 * True when `instant`, read as wall-clock time in `timeZone`, falls inside the curfew.
 * Handles the overnight case (start > end). A zero-length window (start === end) is
 * treated as "no curfew".
 */
export function isInstantInCurfew(instant: Date, timeZone: string, curfew: MessageCurfewWindow): boolean {
  const start = curfewTimeToMinutes(curfew.start);
  const end = curfewTimeToMinutes(curfew.end);
  if (start === null || end === null || start === end) return false;
  const t = minutesOfDayInZone(instant, timeZone);
  return start < end ? t >= start && t < end : t >= start || t < end;
}

export interface CurfewEvaluation {
  /** The send's start instant is inside the curfew. */
  startInCurfew: boolean;
  /** The send's estimated completion instant is inside the curfew. */
  endInCurfew: boolean;
  /** Either boundary is inside the curfew, so an override is required. */
  inCurfew: boolean;
}

/**
 * Evaluates a planned send against the curfew: checks both the start instant and the
 * estimated completion instant (start + delivery time). Returns all-false when there is
 * no curfew or no valid start.
 */
export function evaluateCurfew(input: {
  curfew: MessageCurfewWindow | null;
  timeZone: string;
  startInstant: Date | null;
  completionSeconds: number;
}): CurfewEvaluation {
  const { curfew, timeZone, startInstant, completionSeconds } = input;
  if (!curfew || !startInstant || Number.isNaN(startInstant.getTime())) {
    return { startInCurfew: false, endInCurfew: false, inCurfew: false };
  }
  const completionInstant = new Date(startInstant.getTime() + Math.max(0, completionSeconds) * 1000);
  const startInCurfew = isInstantInCurfew(startInstant, timeZone, curfew);
  const endInCurfew = isInstantInCurfew(completionInstant, timeZone, curfew);
  return { startInCurfew, endInCurfew, inCurfew: startInCurfew || endInCurfew };
}

/** Formats a curfew "HH:MM" wall-clock time as a 12-hour label, e.g. "7:00 PM". */
export function formatCurfewTime(value: string): string {
  const minutes = curfewTimeToMinutes(value);
  if (minutes === null) return value;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

/** Formats the curfew window, e.g. "7:00 PM to 8:00 AM". */
export function formatCurfewWindow(curfew: MessageCurfewWindow): string {
  return `${formatCurfewTime(curfew.start)} to ${formatCurfewTime(curfew.end)}`;
}

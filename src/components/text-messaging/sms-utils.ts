/**
 * Pure SMS math shared by the compose form (live counters and hints) and the server
 * actions (cost recorded in the review step). No DOM, no MP access.
 *
 * Encoding rules follow the GSM 03.38 spec Twilio applies:
 *  - GSM-7: 160 characters in one segment, 153 per segment when concatenated.
 *    Characters in the extended table cost two septets each.
 *  - UCS-2: any character outside GSM-7 forces the whole message to UCS-2, where a
 *    segment holds 70 UTF-16 code units (67 when concatenated). Emoji are two units.
 */

export type SmsEncoding = 'GSM-7' | 'UCS-2';

/** Every character of the GSM 03.38 basic table (one septet each). */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/** GSM 03.38 extended table: each costs an escape septet plus the character. */
const GSM_EXTENDED = '\f^{}\\[~]|€';

const GSM_BASIC_SET = new Set(GSM_BASIC);
const GSM_EXTENDED_SET = new Set(GSM_EXTENDED);

export const GSM_SINGLE_SEGMENT_LIMIT = 160;
export const GSM_MULTI_SEGMENT_LIMIT = 153;
export const UCS2_SINGLE_SEGMENT_LIMIT = 70;
export const UCS2_MULTI_SEGMENT_LIMIT = 67;

/**
 * MinistryPlatform caps a text message at this many characters: the send path mirrors
 * the body into the dp_Communication_Messages.Subject column, which is limited to 500.
 */
export const SMS_MAX_BODY_LENGTH = 500;

/**
 * Lookalike replacements for the characters that most often sneak in from word
 * processors and force UCS-2. Characters without an entry (emoji, most symbols) can
 * only be removed.
 */
export const NON_GSM_REPLACEMENTS: Record<string, string> = {
  '‘': "'", // left single quote
  '’': "'", // right single quote / apostrophe
  '‚': "'",
  '‛': "'",
  '“': '"', // left double quote
  '”': '"', // right double quote
  '„': '"',
  '′': "'", // prime
  '″': '"', // double prime
  '–': '-', // en dash
  '—': '-', // em dash
  '―': '-',
  '−': '-', // minus sign
  '…': '...', // ellipsis
  ' ': ' ', // no-break space
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  '•': '-', // bullet
  '·': '-', // middle dot
  '™': 'TM',
  '®': '(R)',
  '©': '(C)',
  '×': 'x',
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '​': '', // zero-width space
  '﻿': '', // BOM
};

/** Human names for the lookalike table, grouped so a notice can say "3 smart quotes". */
const LOOKALIKE_GROUPS: Array<{ label: string; plural: string; chars: string }> = [
  { label: 'smart quote', plural: 'smart quotes', chars: '\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u2032\u2033' },
  { label: 'dash', plural: 'dashes', chars: '\u2013\u2014\u2015\u2212' },
  { label: 'ellipsis', plural: 'ellipses', chars: '\u2026' },
  { label: 'special space', plural: 'special spaces', chars: '\u00A0\u2009\u200A\u2002\u2003\u200B\uFEFF' },
  { label: 'bullet', plural: 'bullets', chars: '\u2022\u00B7' },
  { label: 'symbol', plural: 'symbols', chars: '\u2122\u00AE\u00A9\u00D7\u00BD\u00BC\u00BE' },
];

export interface LookalikeReplacement {
  /** Group label, e.g. "smart quote". */
  label: string;
  plural: string;
  count: number;
}

export interface NormalizeResult {
  text: string;
  /** Groups that had at least one replacement, in table order. Empty when nothing changed. */
  replacements: LookalikeReplacement[];
  /** Total characters replaced. */
  total: number;
}

/**
 * Replaces only the characters that have a plain lookalike (curly quotes, dashes,
 * ellipsis, odd spaces, bullets, a few symbols). Emoji and other characters with no
 * plain equivalent are left alone so the sender still sees them flagged. Safe to run
 * on every keystroke: the output never grows except for the ellipsis and symbol
 * expansions, and never changes meaning.
 */
export function normalizeLookalikes(text: string): NormalizeResult {
  if (!text) return { text, replacements: [], total: 0 };
  const counts = new Map<string, number>();
  let out = '';
  let changed = false;
  for (const char of text) {
    const replacement = NON_GSM_REPLACEMENTS[char];
    if (replacement === undefined) {
      out += char;
      continue;
    }
    changed = true;
    out += replacement;
    const group = LOOKALIKE_GROUPS.find((g) => g.chars.includes(char));
    const key = group?.label ?? 'special character';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!changed) return { text, replacements: [], total: 0 };
  const replacements: LookalikeReplacement[] = [];
  let total = 0;
  for (const group of LOOKALIKE_GROUPS) {
    const count = counts.get(group.label);
    if (count) {
      replacements.push({ label: group.label, plural: group.plural, count });
      total += count;
    }
  }
  const other = counts.get('special character');
  if (other) {
    replacements.push({ label: 'special character', plural: 'special characters', count: other });
    total += other;
  }
  return { text: out, replacements, total };
}

/** "3 smart quotes and 1 dash" for a normalize notice. */
export function describeReplacements(replacements: LookalikeReplacement[]): string {
  const parts = replacements.map((r) => `${r.count} ${r.count === 1 ? r.label : r.plural}`);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export interface NonGsmCharacter {
  /** The offending character (a full code point, so emoji are one entry). */
  char: string;
  /** Index of the first occurrence in the body (UTF-16 offset). */
  index: number;
  /** How many times it appears. */
  count: number;
  /** Suggested GSM-safe replacement, or null when it can only be removed. */
  replacement: string | null;
}

export interface SmsAnalysis {
  encoding: SmsEncoding;
  /** Visible characters (code points). */
  characterCount: number;
  /**
   * Billable units: septets for GSM-7 (extended characters count twice), UTF-16 code
   * units for UCS-2.
   */
  unitCount: number;
  segments: number;
  /** Units a single segment can hold at the detected encoding. */
  segmentCapacity: number;
  /** Units left before another segment is needed (0 when exactly at a boundary). */
  unitsRemainingInSegment: number;
  nonGsmCharacters: NonGsmCharacter[];
  /**
   * Segments the same text would take if every non-GSM character were replaced or
   * removed. Equals `segments` when the body is already GSM-7.
   */
  segmentsIfGsm: number;
  overMaxLength: boolean;
}

export function isGsmCharacter(char: string): boolean {
  return GSM_BASIC_SET.has(char) || GSM_EXTENDED_SET.has(char);
}

function gsmUnits(text: string): number {
  let units = 0;
  for (const char of text) {
    units += GSM_EXTENDED_SET.has(char) ? 2 : 1;
  }
  return units;
}

function segmentsFor(units: number, single: number, multi: number): number {
  if (units === 0) return 0;
  if (units <= single) return 1;
  return Math.ceil(units / multi);
}

/** Finds every non-GSM character in `text`, deduped, in first-occurrence order. */
export function findNonGsmCharacters(text: string): NonGsmCharacter[] {
  const found = new Map<string, NonGsmCharacter>();
  let offset = 0;
  for (const char of text) {
    if (!isGsmCharacter(char)) {
      const existing = found.get(char);
      if (existing) {
        existing.count += 1;
      } else {
        found.set(char, {
          char,
          index: offset,
          count: 1,
          replacement: NON_GSM_REPLACEMENTS[char] ?? null,
        });
      }
    }
    offset += char.length;
  }
  return [...found.values()];
}

/**
 * Replaces every non-GSM character that has a known lookalike and strips the rest.
 * The result is always GSM-7 encodable.
 */
export function toGsmSafe(text: string): string {
  let out = '';
  for (const char of text) {
    if (isGsmCharacter(char)) {
      out += char;
    } else if (char in NON_GSM_REPLACEMENTS) {
      out += NON_GSM_REPLACEMENTS[char];
    }
  }
  return out;
}

/** Counts, encodes, and segments a message body. */
export function analyzeSms(text: string): SmsAnalysis {
  const nonGsmCharacters = findNonGsmCharacters(text);
  const encoding: SmsEncoding = nonGsmCharacters.length === 0 ? 'GSM-7' : 'UCS-2';
  const characterCount = [...text].length;

  const unitCount = encoding === 'GSM-7' ? gsmUnits(text) : text.length;
  const [single, multi] =
    encoding === 'GSM-7'
      ? [GSM_SINGLE_SEGMENT_LIMIT, GSM_MULTI_SEGMENT_LIMIT]
      : [UCS2_SINGLE_SEGMENT_LIMIT, UCS2_MULTI_SEGMENT_LIMIT];
  const segments = segmentsFor(unitCount, single, multi);
  const segmentCapacity = segments <= 1 ? single : multi;
  const capacityAtCurrentSegments = segments <= 1 ? single : multi * segments;
  const unitsRemainingInSegment = Math.max(0, capacityAtCurrentSegments - unitCount);

  const segmentsIfGsm =
    encoding === 'GSM-7'
      ? segments
      : segmentsFor(gsmUnits(toGsmSafe(text)), GSM_SINGLE_SEGMENT_LIMIT, GSM_MULTI_SEGMENT_LIMIT);

  return {
    encoding,
    characterCount,
    unitCount,
    segments,
    segmentCapacity,
    unitsRemainingInSegment,
    nonGsmCharacters,
    segmentsIfGsm,
    overMaxLength: characterCount > SMS_MAX_BODY_LENGTH,
  };
}

// =====================================================================
// Pricing and throughput
// =====================================================================

export interface CostEstimateInput {
  recipients: number;
  /** Segments per recipient message (SMS only; ignored for MMS). */
  segments: number;
  costPerSegment: number;
  mmsCostPerMessage: number;
  isMms: boolean;
}

export interface CostEstimate {
  perRecipient: number;
  total: number;
  /** Total billable segments (recipients x segments for SMS; recipients for MMS). */
  totalSegments: number;
  /** True when the same text would cost less sent as an MMS. */
  mmsWouldBeCheaper: boolean;
  /** Per-recipient saving if switched to MMS (0 when MMS is not cheaper). */
  mmsSavingPerRecipient: number;
}

export function estimateCost(input: CostEstimateInput): CostEstimate {
  const recipients = Math.max(0, Math.trunc(input.recipients));
  const segments = Math.max(0, Math.trunc(input.segments));
  const smsPerRecipient = segments * input.costPerSegment;
  const perRecipient = input.isMms ? input.mmsCostPerMessage : smsPerRecipient;
  const mmsWouldBeCheaper = !input.isMms && segments > 0 && input.mmsCostPerMessage < smsPerRecipient;
  return {
    perRecipient,
    total: perRecipient * recipients,
    totalSegments: input.isMms ? recipients : recipients * segments,
    mmsWouldBeCheaper,
    mmsSavingPerRecipient: mmsWouldBeCheaper ? smsPerRecipient - input.mmsCostPerMessage : 0,
  };
}

/** Seconds to drain `totalSegments` at `segmentsPerSecond`. */
export function estimateCompletionSeconds(totalSegments: number, segmentsPerSecond: number): number {
  if (totalSegments <= 0 || segmentsPerSecond <= 0) return 0;
  return Math.ceil(totalSegments / segmentsPerSecond);
}

/** "under a minute", "about 4 minutes", "about 1 hour 12 minutes". */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'no time';
  if (seconds < 60) return 'under a minute';
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  if (minutes === 0) return `about ${hourPart}`;
  return `about ${hourPart} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

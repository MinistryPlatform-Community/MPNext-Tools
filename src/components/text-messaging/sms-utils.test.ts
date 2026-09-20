import { describe, it, expect } from 'vitest';
import {
  analyzeSms,
  describeReplacements,
  normalizeLookalikes,
  estimateCompletionSeconds,
  estimateCost,
  findNonGsmCharacters,
  formatDuration,
  isGsmCharacter,
  toGsmSafe,
} from './sms-utils';

describe('analyzeSms', () => {
  it('returns zero segments for an empty body', () => {
    const a = analyzeSms('');
    expect(a.segments).toBe(0);
    expect(a.encoding).toBe('GSM-7');
    expect(a.characterCount).toBe(0);
  });

  it('counts a plain GSM message as one segment up to 160 characters', () => {
    const a = analyzeSms('a'.repeat(160));
    expect(a.encoding).toBe('GSM-7');
    expect(a.unitCount).toBe(160);
    expect(a.segments).toBe(1);
    expect(a.unitsRemainingInSegment).toBe(0);
  });

  it('splits GSM messages into 153-character segments once over 160', () => {
    expect(analyzeSms('a'.repeat(161)).segments).toBe(2);
    expect(analyzeSms('a'.repeat(306)).segments).toBe(2);
    expect(analyzeSms('a'.repeat(307)).segments).toBe(3);
  });

  it('charges two units for GSM extended characters', () => {
    const a = analyzeSms('a{}~€');
    expect(a.encoding).toBe('GSM-7');
    expect(a.characterCount).toBe(5);
    expect(a.unitCount).toBe(9);
  });

  it('switches to UCS-2 with 70/67 limits when a smart quote appears', () => {
    const a = analyzeSms('It’s ' + 'a'.repeat(66));
    expect(a.encoding).toBe('UCS-2');
    expect(a.characterCount).toBe(71);
    expect(a.segments).toBe(2);
    expect(a.nonGsmCharacters).toEqual([{ char: '’', index: 2, count: 1, replacement: "'" }]);
    expect(a.segmentsIfGsm).toBe(1);
  });

  it('counts emoji as two UCS-2 units and offers no replacement', () => {
    const a = analyzeSms('Hi 😀😀');
    expect(a.encoding).toBe('UCS-2');
    expect(a.characterCount).toBe(5);
    expect(a.unitCount).toBe(7);
    expect(a.nonGsmCharacters).toEqual([{ char: '😀', index: 3, count: 2, replacement: null }]);
  });

  it('flags bodies over the 500 character MinistryPlatform cap', () => {
    expect(analyzeSms('a'.repeat(500)).overMaxLength).toBe(false);
    expect(analyzeSms('a'.repeat(501)).overMaxLength).toBe(true);
  });
});

describe('GSM character helpers', () => {
  it('recognizes basic and extended characters', () => {
    expect(isGsmCharacter('A')).toBe(true);
    expect(isGsmCharacter('é')).toBe(true);
    expect(isGsmCharacter('€')).toBe(true);
    expect(isGsmCharacter('—')).toBe(false);
  });

  it('dedupes non-GSM characters in first-occurrence order', () => {
    const found = findNonGsmCharacters('“hi” — “there”');
    expect(found.map((f) => f.char)).toEqual(['“', '”', '—']);
    expect(found[0].count).toBe(2);
  });

  it('toGsmSafe replaces lookalikes and strips the rest', () => {
    expect(toGsmSafe('“Hello” — it’s 😀 fine…')).toBe('"Hello" - it\'s  fine...');
    expect(analyzeSms(toGsmSafe('café – ‘ok’')).encoding).toBe('GSM-7');
  });
});

describe('estimateCost', () => {
  it('multiplies segments by recipients for SMS', () => {
    const c = estimateCost({ recipients: 100, segments: 2, costPerSegment: 0.01, mmsCostPerMessage: 0.02, isMms: false });
    expect(c.perRecipient).toBeCloseTo(0.02);
    expect(c.total).toBeCloseTo(2);
    expect(c.totalSegments).toBe(200);
    expect(c.mmsWouldBeCheaper).toBe(false);
  });

  it('bills MMS once per recipient regardless of segments', () => {
    const c = estimateCost({ recipients: 10, segments: 5, costPerSegment: 0.01, mmsCostPerMessage: 0.02, isMms: true });
    expect(c.perRecipient).toBeCloseTo(0.02);
    expect(c.total).toBeCloseTo(0.2);
    expect(c.totalSegments).toBe(10);
    expect(c.mmsWouldBeCheaper).toBe(false);
  });

  it('flags when MMS would be cheaper than a multi-segment SMS', () => {
    const c = estimateCost({ recipients: 1, segments: 3, costPerSegment: 0.0083, mmsCostPerMessage: 0.022, isMms: false });
    expect(c.mmsWouldBeCheaper).toBe(true);
    expect(c.mmsSavingPerRecipient).toBeCloseTo(0.0029);
  });

  it('handles zero recipients', () => {
    const c = estimateCost({ recipients: 0, segments: 1, costPerSegment: 0.01, mmsCostPerMessage: 0.02, isMms: false });
    expect(c.total).toBe(0);
    expect(c.totalSegments).toBe(0);
  });
});

describe('completion time', () => {
  it('divides total segments by throughput and rounds up', () => {
    expect(estimateCompletionSeconds(9, 3)).toBe(3);
    expect(estimateCompletionSeconds(10, 3)).toBe(4);
    expect(estimateCompletionSeconds(0, 3)).toBe(0);
    expect(estimateCompletionSeconds(10, 0)).toBe(0);
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('no time');
    expect(formatDuration(30)).toBe('under a minute');
    expect(formatDuration(61)).toBe('about 2 minutes');
    expect(formatDuration(3600)).toBe('about 1 hour');
    expect(formatDuration(3660)).toBe('about 1 hour 1 minute');
  });
});

describe('normalizeLookalikes', () => {
  it('replaces quotes, dashes, ellipsis, and odd spaces but leaves emoji alone', () => {
    const r = normalizeLookalikes('\u201CHi\u201D \u2014 it\u2019s\u00A0here\u2026 \ud83d\ude00');
    expect(r.text).toBe('"Hi" - it\'s here... \ud83d\ude00');
    expect(r.total).toBe(6);
    expect(r.replacements).toEqual([
      { label: 'smart quote', plural: 'smart quotes', count: 3 },
      { label: 'dash', plural: 'dashes', count: 1 },
      { label: 'ellipsis', plural: 'ellipses', count: 1 },
      { label: 'special space', plural: 'special spaces', count: 1 },
    ]);
    expect(normalizeLookalikes(r.text).total).toBe(0); // idempotent; the emoji is left for the warning
  });

  it('returns the same text and no replacements when nothing matches', () => {
    const r = normalizeLookalikes('plain text, "quoted" - fine');
    expect(r).toEqual({ text: 'plain text, "quoted" - fine', replacements: [], total: 0 });
    expect(normalizeLookalikes('')).toEqual({ text: '', replacements: [], total: 0 });
  });

  it('describes replacements in a sentence', () => {
    expect(describeReplacements([{ label: 'smart quote', plural: 'smart quotes', count: 1 }])).toBe('1 smart quote');
    expect(
      describeReplacements([
        { label: 'smart quote', plural: 'smart quotes', count: 3 },
        { label: 'dash', plural: 'dashes', count: 1 },
        { label: 'ellipsis', plural: 'ellipses', count: 2 },
      ])
    ).toBe('3 smart quotes, 1 dash and 2 ellipses');
  });
});

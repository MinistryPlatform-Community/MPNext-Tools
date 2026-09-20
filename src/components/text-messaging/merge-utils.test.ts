import { describe, it, expect } from 'vitest';
import {
  extractPlaceholders,
  findUnknownPlaceholders,
  labelForToken,
  mergePlaceholders,
  normalizePhoneForDedupe,
  sampleMergeValues,
  STANDARD_MERGE_FIELDS,
} from './merge-utils';

describe('extractPlaceholders', () => {
  it('returns distinct tokens in order', () => {
    expect(extractPlaceholders('Hi [Nickname], [First_Name] [Nickname] [Group_Name]')).toEqual([
      'Nickname',
      'First_Name',
      'Group_Name',
    ]);
  });

  it('ignores brackets with spaces or punctuation', () => {
    expect(extractPlaceholders('[not a token] [Ok_1] [bad-token]')).toEqual(['Ok_1']);
  });
});

describe('mergePlaceholders', () => {
  it('replaces tokens case-insensitively and blanks unknown or null ones', () => {
    const out = mergePlaceholders('Hi [nickname] [Last_Name] [Missing]!', {
      Nickname: 'Sam',
      Last_Name: null,
    });
    expect(out).toBe('Hi Sam  !');
  });

  it('stringifies numbers and leaves text without brackets untouched', () => {
    expect(mergePlaceholders('Table [Table_Number]', { Table_Number: 4 })).toBe('Table 4');
    expect(mergePlaceholders('no tokens', {})).toBe('no tokens');
  });
});

describe('findUnknownPlaceholders', () => {
  it('lists tokens none of the known fields provide', () => {
    expect(findUnknownPlaceholders('[Nickname] [Group_Name] [first_name]', ['Nickname', 'First_Name'])).toEqual([
      'Group_Name',
    ]);
  });
});

describe('normalizePhoneForDedupe', () => {
  it('collapses formatting and a leading US country code', () => {
    expect(normalizePhoneForDedupe('+1 (602) 555-0142')).toBe('6025550142');
    expect(normalizePhoneForDedupe('602-555-0142')).toBe('6025550142');
  });

  it('returns null for empty or too-short values', () => {
    expect(normalizePhoneForDedupe(null)).toBeNull();
    expect(normalizePhoneForDedupe('123')).toBeNull();
  });
});

describe('sample values and labels', () => {
  it('maps every standard field to its sample', () => {
    const samples = sampleMergeValues(STANDARD_MERGE_FIELDS);
    expect(samples.First_Name).toBe('Samuel');
    expect(Object.keys(samples)).toHaveLength(STANDARD_MERGE_FIELDS.length);
  });

  it('turns tokens into labels', () => {
    expect(labelForToken('Group_Name')).toBe('Group Name');
  });
});

import { describe, it, expect } from 'vitest';
import { commentText, propertyKey, positiveInt } from './codegen-escape';

describe('commentText', () => {
  it('passes ordinary text through', () => {
    expect(commentText('Contacts.Contact_ID')).toBe('Contacts.Contact_ID');
  });

  it('cannot close a block comment', () => {
    const out = commentText('Evil */ export const x = 1; /*');
    expect(out).not.toContain('*/');
  });

  it.each(['\n', '\r\n', '\u2028', '\u2029'])('cannot end a line comment with %j', (nl) => {
    const out = commentText(`Table${nl}export const pwned = true;`);
    expect(out).not.toMatch(/[\r\n\u2028\u2029]/);
  });

  it('stringifies null/undefined to empty', () => {
    expect(commentText(undefined)).toBe('');
    expect(commentText(null)).toBe('');
  });
});

describe('propertyKey', () => {
  it('leaves valid identifiers bare', () => {
    expect(propertyKey('Contact_ID')).toBe('Contact_ID');
  });

  it('quotes names with special characters', () => {
    expect(propertyKey('Allow_Check-in')).toBe('"Allow_Check-in"');
  });

  it.each(['a"b', 'a\\b', 'a\nb', '"; export const x = 1; "'])('produces a single valid string literal for %j', (name) => {
    const key = propertyKey(name);
    expect(JSON.parse(key)).toBe(name);
  });
});

describe('positiveInt', () => {
  it.each([[50, 50], ['50', 50]])('accepts %j', (input, expected) => {
    expect(positiveInt(input)).toBe(expected);
  });

  it.each([0, -1, 1.5, NaN, Infinity, '1); process.exit(1', '', null, undefined, {}])('rejects %j', (input) => {
    expect(positiveInt(input)).toBeUndefined();
  });
});

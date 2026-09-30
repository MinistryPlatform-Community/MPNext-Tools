import { describe, it, expect } from 'vitest';
import {
  validateGuid,
  validatePositiveInt,
  validateColumnName,
  validateFkPath,
  escapeFilterString,
  validateMailerId,
  MAX_SEARCH_TERM_LENGTH,
} from './validation';

describe('validation', () => {
  describe('validateGuid', () => {
    it('accepts a valid GUID', () => {
      const guid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateGuid(guid)).toBe(guid);
    });

    it('accepts uppercase GUID', () => {
      const guid = '550E8400-E29B-41D4-A716-446655440000';
      expect(validateGuid(guid)).toBe(guid);
    });

    it('throws on malformed GUID', () => {
      expect(() => validateGuid('not-a-guid')).toThrow('Invalid GUID format');
    });

    it('throws on empty string', () => {
      expect(() => validateGuid('')).toThrow('Invalid GUID format');
    });

    it('throws on SQL injection attempt', () => {
      expect(() => validateGuid("'; DROP TABLE--")).toThrow('Invalid GUID format');
    });
  });

  describe('validatePositiveInt', () => {
    it('accepts positive integer', () => {
      expect(validatePositiveInt(42)).toBe(42);
    });

    it('throws on zero', () => {
      expect(() => validatePositiveInt(0)).toThrow('Expected positive integer');
    });

    it('throws on negative number', () => {
      expect(() => validatePositiveInt(-5)).toThrow('Expected positive integer');
    });

    it('throws on float', () => {
      expect(() => validatePositiveInt(3.14)).toThrow('Expected positive integer');
    });

    it('throws on NaN', () => {
      expect(() => validatePositiveInt(NaN)).toThrow('Expected positive integer');
    });
  });

  describe('validateColumnName', () => {
    it('accepts valid column names', () => {
      expect(validateColumnName('Contact_ID')).toBe('Contact_ID');
      expect(validateColumnName('_private')).toBe('_private');
      expect(validateColumnName('name123')).toBe('name123');
    });

    it('throws on names starting with digit', () => {
      expect(() => validateColumnName('1column')).toThrow('Invalid column name');
    });

    it('throws on names with special characters', () => {
      expect(() => validateColumnName('col-name')).toThrow('Invalid column name');
    });

    it('throws on SQL injection attempt', () => {
      expect(() => validateColumnName("' OR 1=1--")).toThrow('Invalid column name');
    });
  });

  describe('validateFkPath', () => {
    it.each([
      'Contact_ID',
      'Participant_ID_TABLE.Contact_ID',
      'Participant_ID_Table.Contact_ID',
      'Building_ID_TABLE_Location_ID_TABLE.Congregation_ID',
      'A_TABLE.B_TABLE.Contact_ID',
    ])('accepts %j', (path) => {
      expect(validateFkPath(path)).toBe(path);
    });

    it.each([
      '',
      'Contact_ID, Password',
      'Participant_ID_TABLE.Contact_ID AS X',
      'Participant_ID.Contact_ID',
      '.Contact_ID',
      'Participant_ID_TABLE.',
      'A_TABLE.B_TABLE.C_TABLE.D_TABLE.E_TABLE.Contact_ID',
      'x'.repeat(257),
      42,
      null,
    ])('refuses %j, naming the field and never the value', (bad) => {
      expect(() => validateFkPath(bad, 'Contact_ID_Field')).toThrow(/^Invalid Contact_ID_Field$/);
    });

    it('uses a generic field name by default', () => {
      expect(() => validateFkPath('a b')).toThrow('Invalid column path');
    });
  });

  describe('validateMailerId', () => {
    it('accepts a 6-digit mailer ID', () => {
      expect(validateMailerId('123456')).toBe('123456');
    });

    it('accepts a 9-digit mailer ID', () => {
      expect(validateMailerId('123456789')).toBe('123456789');
    });

    it('throws on empty string', () => {
      expect(() => validateMailerId('')).toThrow('Mailer ID must be exactly 6 or 9 digits');
    });

    it('throws on 7-digit input (invalid length)', () => {
      expect(() => validateMailerId('1234567')).toThrow('Mailer ID must be exactly 6 or 9 digits');
    });

    it('throws on non-digit characters', () => {
      expect(() => validateMailerId('12345a')).toThrow('Mailer ID must be exactly 6 or 9 digits');
    });
  });

  describe('escapeFilterString', () => {
    it('escapes single quotes', () => {
      expect(escapeFilterString("O'Brien")).toBe("O''Brien");
    });

    it('escapes percent signs', () => {
      expect(escapeFilterString('50%')).toBe('50[%]');
    });

    it('escapes underscores', () => {
      expect(escapeFilterString('my_field')).toBe('my[_]field');
    });

    it('escapes all special characters together', () => {
      expect(escapeFilterString("O'Brien_50%")).toBe("O''Brien[_]50[%]");
    });

    it('returns empty string unchanged', () => {
      expect(escapeFilterString('')).toBe('');
    });

    it('escapes [ so it cannot open a LIKE character class', () => {
      // Unescaped, `[a-z]` would match any single letter instead of itself.
      expect(escapeFilterString('[a-z]')).toBe('[[]a-z]');
    });

    it('escapes [ before % and _ so their bracket escapes are not re-escaped', () => {
      expect(escapeFilterString('[%_')).toBe('[[][%][_]');
    });

    it('turns quote look-alikes into the single-char wildcard, never a raw quote', () => {
      expect(escapeFilterString('O’Brien')).toBe('O_Brien');
      expect(escapeFilterString('‘‛ʼ＇')).toBe('____');
    });

    it.each([['array', ['x']], ['object', { a: 1 }], ['number', 1], ['null', null]])(
      'refuses a non-string (%s) rather than stringifying it into the filter',
      (_label, value) => {
        expect(() => escapeFilterString(value as unknown as string)).toThrow(
          'Invalid search value: expected a string',
        );
      },
    );

    it.each(['a\u0000b', 'line\nbreak', 'tab\there', 'del\u007F'])(
      'refuses control characters (%j)',
      (value) => {
        expect(() => escapeFilterString(value)).toThrow(
          'Invalid search value: control characters are not allowed',
        );
      },
    );

    it('caps the search term length', () => {
      expect(escapeFilterString('a'.repeat(MAX_SEARCH_TERM_LENGTH))).toHaveLength(MAX_SEARCH_TERM_LENGTH);
      expect(() => escapeFilterString('a'.repeat(MAX_SEARCH_TERM_LENGTH + 1))).toThrow(
        /longer than 100 characters/,
      );
    });

    it('never echoes the refused value', () => {
      const err = (() => {
        try {
          escapeFilterString("secret'" + String.fromCharCode(10) + '--');
        } catch (e) {
          return e as Error;
        }
      })();
      expect(err?.message).not.toContain('secret');
    });
  });

  describe('error messages name the field, never the value (rule 14)', () => {
    const NEWLINE = String.fromCharCode(10);
    const HOSTILE = `evil'${NEWLINE}{"event":"forged"}`;

    it.each([
      ['validateGuid', () => validateGuid(HOSTILE)],
      ['validateColumnName', () => validateColumnName(HOSTILE)],
      ['validatePositiveInt', () => validatePositiveInt(HOSTILE as unknown as number)],
      ['validateFkPath', () => validateFkPath(HOSTILE)],
    ])('%s', (_name, call) => {
      let message = '';
      try {
        call();
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).not.toBe('');
      expect(message).not.toContain('evil');
      expect(message).not.toContain(NEWLINE);
    });

    it('validatePositiveInt names the field when given one', () => {
      expect(() => validatePositiveInt(0, 'groupId')).toThrow('Expected positive integer for groupId');
    });

    it('validatePositiveInt refuses unsafe integers', () => {
      expect(() => validatePositiveInt(2 ** 53)).toThrow('Expected positive integer');
    });

    it('validateGuid refuses a non-string that would stringify into a valid GUID', () => {
      expect(() =>
        validateGuid(['550e8400-e29b-41d4-a716-446655440000'] as unknown as string),
      ).toThrow('Invalid GUID format');
    });
  });
});

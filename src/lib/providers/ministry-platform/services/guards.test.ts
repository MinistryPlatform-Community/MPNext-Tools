import { describe, it, expect } from 'vitest';
import {
  errorName,
  sanitizeIdentifier,
  sanitizeRecordId,
  sanitizeUniqueId,
  tableEndpoint,
} from '@/lib/providers/ministry-platform/services/guards';

describe('sanitizeIdentifier', () => {
  it.each(['Contacts', 'Contact_Log', 'dp_Users', '_x', 'api_Custom_Get_Contacts2', 'a'.repeat(128)])(
    'should accept %j',
    (name) => {
      expect(sanitizeIdentifier(name, 'table name')).toBe(name);
    }
  );

  it.each([
    '..',
    '.',
    'a/b',
    'a\\b',
    'a?b',
    'a#b',
    'a%2e',
    'a b',
    'a-b',
    'a.b',
    '9a',
    '',
    'a'.repeat(129),
    'Contacts\n',
    'Ｃontacts', // full-width letter
  ])('should refuse %j with a fixed message', (name) => {
    expect(() => sanitizeIdentifier(name, 'table name')).toThrow(/^Invalid table name$/);
  });

  it.each([undefined, null, 1, {}, ['Contacts']])('should refuse the non-string %j', (value) => {
    expect(() => sanitizeIdentifier(value, 'procedure name')).toThrow('Invalid procedure name');
  });
});

describe('errorName', () => {
  it('should return the class name of an Error, never its message', () => {
    expect(errorName(new SyntaxError('"Jane Doe" is not valid JSON'))).toBe('SyntaxError');
    expect(errorName(new TypeError('fetch failed'))).toBe('TypeError');
  });

  it('should return a DOMException name such as TimeoutError', () => {
    expect(errorName(new DOMException('timed out', 'TimeoutError'))).toBe('TimeoutError');
  });

  it('should return the typeof a non-Error value', () => {
    expect(errorName('raw body')).toBe('string');
    expect(errorName(undefined)).toBe('undefined');
    expect(errorName(null)).toBe('object');
    expect(errorName({ message: 'x' })).toBe('object');
  });

  it('should not log a name that is not class-name shaped', () => {
    expect(errorName({ name: 'Jane Doe, 12 Main St' })).toBe('object');
    expect(errorName({ name: 42 })).toBe('object');
    expect(errorName({ name: 'x'.repeat(65) })).toBe('object');
  });
});

describe('sanitizeRecordId', () => {
  it.each([1, 42, Number.MAX_SAFE_INTEGER])('should accept %j', (id) => {
    expect(sanitizeRecordId(id, 'record ID')).toBe(id);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53, '1', '1/../x', null, undefined, {}, [1]])(
    'should refuse %j with a message naming the field only',
    (id) => {
      expect(() => sanitizeRecordId(id, 'file ID')).toThrow(/^Expected positive integer for file ID$/);
    }
  );
});

describe('sanitizeUniqueId', () => {
  it('should accept a GUID', () => {
    const guid = '0F8FAD5B-D9CB-469F-A165-70867728950E';
    expect(sanitizeUniqueId(guid)).toBe(guid);
  });

  it.each(['abc', '../tables/Contacts', `0f8fad5b-d9cb-469f-a165-70867728950e/../x`, 1, undefined])(
    'should refuse %j without echoing it',
    (value) => {
      expect(() => sanitizeUniqueId(value)).toThrow(/^Invalid GUID format$/);
    }
  );
});

describe('tableEndpoint', () => {
  it('should build /tables/{table} for a valid name', () => {
    expect(tableEndpoint('Contact_Log')).toBe('/tables/Contact_Log');
  });

  it('should refuse a traversal', () => {
    expect(() => tableEndpoint('..')).toThrow('Invalid table name');
  });
});

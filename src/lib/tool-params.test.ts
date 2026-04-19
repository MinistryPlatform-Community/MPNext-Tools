import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock state so `vi.mock` factory can reference it without TDZ issues.
const mocks = vi.hoisted(() => ({
  getPageData: vi.fn(),
}));

vi.mock('@/services/toolService', () => ({
  ToolService: class {
    static instance: unknown;
    static async getInstance() {
      if (!this.instance) {
        this.instance = new this();
      }
      return this.instance;
    }
    getPageData = mocks.getPageData;
  },
}));

import { parseToolParams, isNewRecord, isEditMode, type PageData } from './tool-params';
import { ToolService } from '@/services/toolService';

describe('tool-params', () => {
  beforeEach(() => {
    // Reset singleton state per CLAUDE.md testing guidance.
    (ToolService as unknown as { instance: unknown }).instance = undefined;
    mocks.getPageData.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseToolParams — input shapes', () => {
    it('parses a URLSearchParams input', async () => {
      const sp = new URLSearchParams('pageID=292&recordID=42&q=hello');
      const params = await parseToolParams(sp);

      expect(params.pageID).toBe(292);
      expect(params.recordID).toBe(42);
      expect(params.q).toBe('hello');
    });

    it('parses a plain-object input', async () => {
      const params = await parseToolParams({
        pageID: '292',
        recordID: '42',
        q: 'hello',
      });

      expect(params.pageID).toBe(292);
      expect(params.recordID).toBe(42);
      expect(params.q).toBe('hello');
    });

    it('collapses array-valued keys to the first element', async () => {
      const params = await parseToolParams({
        pageID: ['292', '999'],
        recordID: ['42', '100'],
      });

      expect(params.pageID).toBe(292);
      expect(params.recordID).toBe(42);
    });

    it('returns undefined for missing keys', async () => {
      const params = await parseToolParams(new URLSearchParams());

      expect(params.pageID).toBeUndefined();
      expect(params.s).toBeUndefined();
      expect(params.sc).toBeUndefined();
      expect(params.p).toBeUndefined();
      expect(params.q).toBeUndefined();
      expect(params.v).toBeUndefined();
      expect(params.recordID).toBeUndefined();
      expect(params.recordDescription).toBeUndefined();
      expect(params.addl).toBeUndefined();
      expect(params.pageData).toBeUndefined();
    });
  });

  describe('parseToolParams — numeric coercion (NaN guard)', () => {
    it('returns undefined for non-numeric pageID (no NaN leak)', async () => {
      const params = await parseToolParams(new URLSearchParams('pageID=abc'));

      expect(params.pageID).toBeUndefined();
      expect(Number.isNaN(params.pageID as unknown as number)).toBe(false);
    });

    it('returns undefined for non-numeric recordID (no NaN leak)', async () => {
      const params = await parseToolParams(new URLSearchParams('recordID=xyz'));

      expect(params.recordID).toBeUndefined();
    });

    it('returns undefined for every non-numeric numeric-expected field', async () => {
      const params = await parseToolParams({
        pageID: 'abc',
        s: 'def',
        sc: 'ghi',
        p: 'jkl',
        v: 'mno',
        recordID: 'pqr',
      });

      expect(params.pageID).toBeUndefined();
      expect(params.s).toBeUndefined();
      expect(params.sc).toBeUndefined();
      expect(params.p).toBeUndefined();
      expect(params.v).toBeUndefined();
      expect(params.recordID).toBeUndefined();
    });

    it('parses numeric strings with trailing garbage per parseInt semantics', async () => {
      // parseInt('42abc', 10) === 42 — this is intentional standard behavior.
      const params = await parseToolParams({ pageID: '42abc' });
      expect(params.pageID).toBe(42);
    });

    it('parses negative recordID = -1 (sentinel for new record)', async () => {
      const params = await parseToolParams({ recordID: '-1' });
      expect(params.recordID).toBe(-1);
    });
  });

  describe('parseToolParams — recordDescription URL-decoding', () => {
    it('decodes URL-encoded recordDescription', async () => {
      const params = await parseToolParams({
        recordDescription: 'Smith%2C%20John',
      });

      expect(params.recordDescription).toBe('Smith, John');
    });

    it('leaves unencoded recordDescription as-is', async () => {
      const params = await parseToolParams({
        recordDescription: 'Plain Text',
      });

      expect(params.recordDescription).toBe('Plain Text');
    });

    it('returns undefined when recordDescription absent', async () => {
      const params = await parseToolParams({});
      expect(params.recordDescription).toBeUndefined();
    });
  });

  describe('parseToolParams — pageData hydration', () => {
    it('hydrates pageData on success', async () => {
      const mockPageData: PageData = {
        Page_ID: 292,
        Display_Name: 'Contacts',
        Singular_Name: 'Contact',
        Table_Name: 'Contacts',
        Primary_Key: 'Contact_ID',
      };
      mocks.getPageData.mockResolvedValueOnce(mockPageData);

      const params = await parseToolParams({ pageID: '292' });

      expect(mocks.getPageData).toHaveBeenCalledWith(292);
      expect(params.pageData).toEqual(mockPageData);
    });

    it('leaves pageData undefined when getPageData returns null', async () => {
      mocks.getPageData.mockResolvedValueOnce(null);

      const params = await parseToolParams({ pageID: '292' });

      expect(params.pageData).toBeUndefined();
    });

    it('swallows getPageData errors and leaves pageData undefined', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mocks.getPageData.mockRejectedValueOnce(new Error('SP does not exist'));

      const params = await parseToolParams({ pageID: '292' });

      expect(params.pageData).toBeUndefined();
      expect(params.pageID).toBe(292); // pageID still returned
      expect(warnSpy).toHaveBeenCalled();
    });

    it('does not call getPageData when pageID is absent', async () => {
      await parseToolParams({ recordID: '42' });
      expect(mocks.getPageData).not.toHaveBeenCalled();
    });

    it('does not call getPageData when pageID is non-numeric (NaN-guarded)', async () => {
      await parseToolParams({ pageID: 'abc' });
      expect(mocks.getPageData).not.toHaveBeenCalled();
    });
  });

  describe('isNewRecord', () => {
    it('returns true when recordID is -1', () => {
      expect(isNewRecord({ recordID: -1 })).toBe(true);
    });

    it('returns true when recordID is undefined', () => {
      expect(isNewRecord({})).toBe(true);
    });

    it('returns false when recordID is a positive number', () => {
      expect(isNewRecord({ recordID: 42 })).toBe(false);
    });

    it('returns false when recordID is 0', () => {
      expect(isNewRecord({ recordID: 0 })).toBe(false);
    });
  });

  describe('isEditMode', () => {
    it('returns false when recordID is -1', () => {
      expect(isEditMode({ recordID: -1 })).toBe(false);
    });

    it('returns false when recordID is undefined', () => {
      expect(isEditMode({})).toBe(false);
    });

    it('returns true when recordID is a positive number', () => {
      expect(isEditMode({ recordID: 42 })).toBe(true);
    });

    it('returns true when recordID is 0', () => {
      expect(isEditMode({ recordID: 0 })).toBe(true);
    });
  });
});

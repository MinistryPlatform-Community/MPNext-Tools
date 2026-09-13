import { describe, it, expect, vi } from 'vitest';
import {
  MERGE_FIELDS,
  MERGE_FIELD_CATEGORIES,
  getFieldsByCategory,
  registerMergeFieldBlocks,
} from './merge-fields';
import type { Editor } from 'grapesjs';

describe('MERGE_FIELD_CATEGORIES', () => {
  it('dedupes categories preserving first-seen order', () => {
    expect(MERGE_FIELD_CATEGORIES).toEqual(['Contact', 'Household', 'Church', 'System']);
  });

  it('matches the set of categories present in MERGE_FIELDS', () => {
    const categoriesInFields = new Set(MERGE_FIELDS.map((f) => f.category));
    expect(new Set(MERGE_FIELD_CATEGORIES)).toEqual(categoriesInFields);
  });
});

describe('getFieldsByCategory', () => {
  it('returns only fields matching the given category', () => {
    const contactFields = getFieldsByCategory('Contact');
    expect(contactFields.length).toBeGreaterThan(0);
    expect(contactFields.every((f) => f.category === 'Contact')).toBe(true);
    expect(contactFields.map((f) => f.value)).toContain('{{First_Name}}');
  });

  it('returns an empty array for an unknown category', () => {
    expect(getFieldsByCategory('Nonexistent')).toEqual([]);
  });
});

describe('registerMergeFieldBlocks', () => {
  it('calls editor.Blocks.add twice with the expected block ids and categories', () => {
    const add = vi.fn();
    const editor = { Blocks: { add } } as unknown as Editor;

    registerMergeFieldBlocks(editor);

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(
      1,
      'merge-field-contact',
      expect.objectContaining({
        label: 'Contact Fields',
        category: 'Merge Fields',
        content: expect.objectContaining({ type: 'mj-text' }),
      }),
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      'merge-field-unsubscribe',
      expect.objectContaining({
        label: 'Unsubscribe Link',
        category: 'Merge Fields',
      }),
    );
  });
});

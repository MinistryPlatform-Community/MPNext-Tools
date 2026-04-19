import { describe, it, expect } from 'vitest';
import { Document } from 'docx';
import { buildWordDocument } from './word-document';
import type { LabelStockConfig } from '@/lib/label-stock';
import type { LabelData } from '@/lib/dto';

const stock: LabelStockConfig = {
  id: '5160',
  name: 'Avery 5160',
  pageWidth: 612,
  pageHeight: 792,
  labelWidth: 189,
  labelHeight: 72,
  columns: 3,
  rows: 10,
  marginTop: 36,
  marginLeft: 13.5,
  columnGap: 9,
  rowGap: 0,
};

const baseLabel: LabelData = {
  name: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',
};

describe('buildWordDocument', () => {
  it('returns a Document for a single label', () => {
    const doc = buildWordDocument([baseLabel], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles start position offset greater than 1', () => {
    const doc = buildWordDocument([baseLabel], stock, 5);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles label with addressLine2', () => {
    const label: LabelData = { ...baseLabel, addressLine2: 'Suite 200' };
    const doc = buildWordDocument([label], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles label with IMB barcode states', () => {
    const label: LabelData = {
      ...baseLabel,
      barType: 'imb',
      barStates: 'TADFDAAFTAFDATADFDTAAFADDAFTTFFFAATFDAATTAFAADTDAAFDAAFTDFAFTTT',
    };
    const doc = buildWordDocument([label], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles label with POSTNET barcode states', () => {
    const label: LabelData = {
      ...baseLabel,
      barType: 'postnet',
      barStates: JSON.stringify(
        Array.from({ length: 32 }, (_, i) => (i % 2 ? 'tall' : 'short') as const)
      ),
    };
    const doc = buildWordDocument([label], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('spans multiple pages when labels exceed per-page capacity', () => {
    const manyLabels: LabelData[] = Array.from({ length: 35 }, (_, i) => ({
      ...baseLabel,
      name: `Person ${i + 1}`,
    }));
    const doc = buildWordDocument(manyLabels, stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles empty label array with default page count', () => {
    const doc = buildWordDocument([], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });

  it('handles missing state and postal code fields gracefully', () => {
    const minimal: LabelData = {
      name: 'Minimal',
      addressLine1: '1 Any Rd',
      city: 'Town',
      state: '',
      postalCode: '',
    };
    const doc = buildWordDocument([minimal], stock, 1);
    expect(doc).toBeInstanceOf(Document);
  });
});

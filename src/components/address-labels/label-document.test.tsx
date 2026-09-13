import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children?: React.ReactNode }) => <div data-testid="document">{children}</div>,
  Page: ({ children }: { children?: React.ReactNode }) => <div data-testid="page">{children}</div>,
  View: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => (
    <div data-testid="view" data-style={JSON.stringify(style)}>{children}</div>
  ),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

vi.mock('./address-label', () => ({
  AddressLabel: ({ data }: { data: { name: string } }) => (
    <div data-testid="address-label">{data.name}</div>
  ),
}));

import { LabelDocument } from './label-document';
import type { LabelStockConfig } from '@/lib/label-stock';
import type { LabelData } from '@/lib/dto';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

function makeLabels(count: number): LabelData[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Label ${i}`,
    addressLine1: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60601',
  }));
}

describe('LabelDocument', () => {
  it('renders a single page for labels that fit within one page', () => {
    const { getAllByTestId } = render(
      <LabelDocument labels={makeLabels(5)} stock={stock} startPosition={1} />
    );
    expect(getAllByTestId('page')).toHaveLength(1);
    expect(getAllByTestId('address-label')).toHaveLength(5);
  });

  it('spills onto a second page when labels exceed one page capacity', () => {
    // 30 per page (3 cols x 10 rows); 35 labels should produce 2 pages.
    const { getAllByTestId } = render(
      <LabelDocument labels={makeLabels(35)} stock={stock} startPosition={1} />
    );
    expect(getAllByTestId('page')).toHaveLength(2);
    expect(getAllByTestId('address-label')).toHaveLength(35);
  });

  it('skips slots before startPosition on the first page', () => {
    const { getAllByTestId } = render(
      <LabelDocument labels={makeLabels(3)} stock={stock} startPosition={5} />
    );
    // Still 1 page, but only 3 address labels rendered (skip count = 4 empty slots)
    expect(getAllByTestId('page')).toHaveLength(1);
    expect(getAllByTestId('address-label')).toHaveLength(3);
  });

  it('renders at least one page even when labels array is empty', () => {
    const { getAllByTestId } = render(
      <LabelDocument labels={[]} stock={stock} startPosition={1} />
    );
    expect(getAllByTestId('page')).toHaveLength(1);
    expect(() => getAllByTestId('address-label')).toThrow();
  });

  it('carries a large startPosition offset across into a second page', () => {
    // startPosition 29 (skip 28) + 5 labels = totalSlots 33 > 30/page -> 2 pages
    const { getAllByTestId } = render(
      <LabelDocument labels={makeLabels(5)} stock={stock} startPosition={29} />
    );
    expect(getAllByTestId('page')).toHaveLength(2);
    expect(getAllByTestId('address-label')).toHaveLength(5);
  });
});

export interface LabelStockConfig {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  columnGap: number;
  rowGap: number;
}

export interface LabelPosition {
  x: number;
  y: number;
  page: number;
}

// All dimensions in points (72pt = 1 inch). Page size is US Letter (8.5" x 11").
export const LABEL_STOCKS: LabelStockConfig[] = [
  {
    id: '5160',
    name: 'Avery 5160 (30/sheet)',
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
  },
  {
    id: '5161',
    name: 'Avery 5161 (20/sheet)',
    pageWidth: 612,
    pageHeight: 792,
    labelWidth: 288,
    labelHeight: 72,
    columns: 2,
    rows: 10,
    marginTop: 36,
    marginLeft: 12,
    columnGap: 12,
    rowGap: 0,
  },
  {
    id: '5162',
    name: 'Avery 5162 (14/sheet)',
    pageWidth: 612,
    pageHeight: 792,
    labelWidth: 288,
    labelHeight: 96,
    columns: 2,
    rows: 7,
    marginTop: 60.75,
    marginLeft: 12,
    columnGap: 12,
    rowGap: 0,
  },
  {
    id: '5163',
    name: 'Avery 5163 (10/sheet)',
    pageWidth: 612,
    pageHeight: 792,
    labelWidth: 288,
    labelHeight: 144,
    columns: 2,
    rows: 5,
    marginTop: 36,
    marginLeft: 12,
    columnGap: 12,
    rowGap: 0,
  },
];

export function getLabelStock(id: string): LabelStockConfig | undefined {
  return LABEL_STOCKS.find((s) => s.id === id);
}

export function getLabelPosition(stock: LabelStockConfig, index: number): LabelPosition {
  const labelsPerPage = stock.columns * stock.rows;
  const page = Math.floor(index / labelsPerPage);
  const indexOnPage = index % labelsPerPage;
  const col = indexOnPage % stock.columns;
  const row = Math.floor(indexOnPage / stock.columns);

  return {
    x: stock.marginLeft + col * (stock.labelWidth + stock.columnGap),
    y: stock.marginTop + row * (stock.labelHeight + stock.rowGap),
    page,
  };
}

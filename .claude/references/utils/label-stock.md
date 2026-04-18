---
title: Label Stock Geometry (Avery 5160 and siblings)
domain: utils
type: reference
applies_to:
  - src/lib/label-stock.ts
symbols:
  - LabelStockConfig
  - LabelPosition
  - LABEL_STOCKS
  - getLabelStock
  - getLabelPosition
related:
  - barcodes.md
  - ../components/README.md
last_verified: 2026-04-17
---

## Purpose
Static geometry for US Letter Avery label sheets (5160/5161/5162/5163) plus a position calculator that maps a zero-based label index to `(x, y, page)` coordinates in PDF/Word points (72pt = 1 inch).

## Files
- `src/lib/label-stock.ts` — config array + helpers
- `src/lib/label-stock.test.ts` — 9 tests covering dimensions, lookup, and position math

## Key concepts
- **Points unit** — All dimensions are typographic points. US Letter = 612 × 792 pt.
- **Index = flat label ordinal** — `getLabelPosition(stock, index)` treats labels as a row-major flat sequence; pagination is implicit (`page = floor(index / (columns * rows))`).
- **No explicit rowGap for 5160–5163** — All four defined stocks have `rowGap: 0` (rows touch vertically).

## API / Interface

```typescript
export interface LabelStockConfig {
  id: string;
  name: string;
  pageWidth: number;   // pt (US Letter = 612)
  pageHeight: number;  // pt (US Letter = 792)
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
  page: number; // zero-based
}

export const LABEL_STOCKS: LabelStockConfig[];
export function getLabelStock(id: string): LabelStockConfig | undefined;
export function getLabelPosition(stock: LabelStockConfig, index: number): LabelPosition;
```

## Stocks defined (`src/lib/label-stock.ts:23`)

| id | Name | columns × rows | labelWidth × labelHeight (pt) | marginTop / marginLeft | columnGap |
|----|------|----------------|-------------------------------|------------------------|-----------|
| `5160` | Avery 5160 (30/sheet) | 3 × 10 | 189 × 72 | 36 / 13.5 | 9 |
| `5161` | Avery 5161 (20/sheet) | 2 × 10 | 288 × 72 | 36 / 12 | 12 |
| `5162` | Avery 5162 (14/sheet) | 2 × 7 | 288 × 96 | 60.75 / 12 | 12 |
| `5163` | Avery 5163 (10/sheet) | 2 × 5 | 288 × 144 | 36 / 12 | 12 |

All four: `pageWidth=612`, `pageHeight=792`, `rowGap=0`.

## How it works

`getLabelPosition(stock, index)`:
- `labelsPerPage = columns * rows`
- `page = floor(index / labelsPerPage)`
- `indexOnPage = index % labelsPerPage`
- `col = indexOnPage % columns`
- `row = floor(indexOnPage / columns)`  ← row-major within a sheet
- `x = marginLeft + col * (labelWidth + columnGap)`
- `y = marginTop + row * (labelHeight + rowGap)`

`getLabelStock(id)` is a linear `Array.find` on `LABEL_STOCKS`.

## Usage

### Looking up a stock in a server action
From `src/components/address-labels/actions.ts:21`:

```typescript
import { getLabelStock } from '@/lib/label-stock';
```

### Enumerating stocks in the form dropdown
From `src/components/address-labels/address-labels-form.tsx:8`:

```typescript
import { LABEL_STOCKS } from '@/lib/label-stock';
```

### Placing labels in the PDF preview
From `src/components/address-labels/label-document.tsx:3-4`:

```typescript
import { getLabelPosition } from '@/lib/label-stock';
import type { LabelStockConfig } from '@/lib/label-stock';
```

### Word export (geometry only)
From `src/components/address-labels/word-document.ts:16`:

```typescript
import type { LabelStockConfig } from '@/lib/label-stock';
```

## Gotchas
- **`getLabelStock` returns `undefined` for unknown IDs.** Callers must guard before dereferencing — see `src/app/(web)/tools/addresslabels/address-labels.tsx:64-65` and `src/components/address-labels/actions.ts:135-138`. The test `should return undefined for unknown stock ID` (`src/lib/label-stock.test.ts:28`) pins the behavior.
- **`startPosition` offset is handled by the caller**, not by `getLabelPosition`. Features that "skip N used labels" add the offset to the index before calling.
- **Landscape / non-Letter stocks are not modeled.** If a new stock is added, it must follow the 612×792 Letter-portrait assumption or the PDF layout code in `label-document.tsx` needs updating.

## Related docs
- `barcodes.md` — barcode renderers sized into the label rectangles defined here
- `../components/README.md` — `address-labels` is the sole consumer

# Address Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tool that prints address labels with USPS Intelligent Mail Barcodes from Ministry Platform contact data, supporting multiple Avery label stocks, household/individual modes, and server-side PDF generation.

**Architecture:** Next.js App Router tool page → client component with config UI → server actions for data fetch + PDF generation → @react-pdf/renderer for label layout → custom IMb encoder for barcode rendering. Data flows: Contact → Household → Address via MP `_TABLE` joins.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, @react-pdf/renderer, Vitest, Radix UI/shadcn components

**Spec:** `docs/superpowers/specs/2026-04-13-address-labels-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/dto/address-label.dto.ts` | Types: LabelData, SkipRecord, LabelConfig, AddressMode |
| `src/lib/label-stock.ts` | Label stock dimension configs (Avery 5160/5161/5162/5163) |
| `src/lib/imb-encoder.ts` | USPS IMb encoding algorithm (pure function) |
| `src/services/addressLabelService.ts` | Singleton service: fetch + filter contact addresses |
| `src/components/address-labels/actions.ts` | Server actions: fetchAddressLabels, generateLabelPdf |
| `src/components/address-labels/imb-barcode.tsx` | @react-pdf/renderer SVG IMb barcode component |
| `src/components/address-labels/address-label.tsx` | Single label View component (name + address + barcode) |
| `src/components/address-labels/label-document.tsx` | @react-pdf/renderer Document with label grid layout |
| `src/components/address-labels/address-labels-form.tsx` | Config panel: stock, mode, start position, barcode toggle |
| `src/components/address-labels/address-labels-summary.tsx` | Printable/skipped counts with expandable details |
| `src/components/address-labels/index.ts` | Barrel exports |
| `src/app/(web)/tools/addresslabels/page.tsx` | Server component: parse tool params |
| `src/app/(web)/tools/addresslabels/address-labels.tsx` | Client wrapper: ToolContainer, state, PDF open |

---

## Task 1: Install dependency and create types

**Files:**
- Modify: `package.json`
- Create: `src/lib/dto/address-label.dto.ts`

- [ ] **Step 1: Install @react-pdf/renderer**

```bash
npm install @react-pdf/renderer
```

Verify it installs without peer dependency errors against React 19. If there are peer dep warnings, check compatibility and use `--legacy-peer-deps` if needed.

- [ ] **Step 2: Create the DTO types**

Create `src/lib/dto/address-label.dto.ts`:

```typescript
export interface LabelData {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  barCode?: string;
}

export type SkipReason = 'no_address' | 'no_postal_code' | 'opted_out' | 'no_barcode';

export interface SkipRecord {
  name: string;
  contactId: number;
  reason: SkipReason;
}

export type AddressMode = 'household' | 'individual';

export interface LabelConfig {
  stockId: string;
  addressMode: AddressMode;
  startPosition: number;
  includeMissingBarcodes: boolean;
}

export interface FetchAddressLabelsResult {
  printable: LabelData[];
  skipped: SkipRecord[];
}
```

- [ ] **Step 3: Add barrel export for the new DTO**

Check `src/lib/dto/index.ts` for existing exports. Add:

```typescript
export type {
  LabelData,
  SkipRecord,
  SkipReason,
  AddressMode,
  LabelConfig,
  FetchAddressLabelsResult,
} from './address-label.dto';
```

No unit tests for the DTO file — it contains only TypeScript type definitions with no runtime logic. Type correctness is verified by the TypeScript compiler during `npm run build`.

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit src/lib/dto/address-label.dto.ts
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dto/address-label.dto.ts src/lib/dto/index.ts package.json package-lock.json
git commit -m "feat(address-labels): add DTO types and install @react-pdf/renderer"
```

---

## Task 2: Label stock definitions

**Files:**
- Create: `src/lib/label-stock.ts`
- Test: `src/lib/label-stock.test.ts`

- [ ] **Step 1: Write failing tests for label stock config**

Create `src/lib/label-stock.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { LABEL_STOCKS, getLabelStock, getLabelPosition } from './label-stock';

describe('label-stock', () => {
  describe('LABEL_STOCKS', () => {
    it('should define 4 label stock configurations', () => {
      expect(LABEL_STOCKS).toHaveLength(4);
    });

    it('should include Avery 5160 with correct dimensions', () => {
      const stock = getLabelStock('5160');
      expect(stock).toBeDefined();
      expect(stock!.columns).toBe(3);
      expect(stock!.rows).toBe(10);
      expect(stock!.labelWidth).toBeCloseTo(189, 0); // 2.625in * 72
      expect(stock!.labelHeight).toBeCloseTo(72, 0);  // 1in * 72
    });

    it('should include Avery 5163 with correct layout', () => {
      const stock = getLabelStock('5163');
      expect(stock).toBeDefined();
      expect(stock!.columns).toBe(2);
      expect(stock!.rows).toBe(5);
    });
  });

  describe('getLabelStock', () => {
    it('should return undefined for unknown stock ID', () => {
      expect(getLabelStock('9999')).toBeUndefined();
    });
  });

  describe('getLabelPosition', () => {
    it('should calculate position for first label on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 0); // index 0 = first label
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop);
      expect(pos.page).toBe(0);
    });

    it('should calculate position for second column on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 1); // index 1 = second column
      expect(pos.x).toBeCloseTo(stock.marginLeft + stock.labelWidth + stock.columnGap);
      expect(pos.page).toBe(0);
    });

    it('should calculate position for second row on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 3); // index 3 = row 1, col 0 (3 cols)
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop + stock.labelHeight + stock.rowGap);
      expect(pos.page).toBe(0);
    });

    it('should wrap to next page when sheet is full', () => {
      const stock = getLabelStock('5160')!;
      const labelsPerPage = stock.columns * stock.rows; // 30
      const pos = getLabelPosition(stock, labelsPerPage); // first label on page 2
      expect(pos.page).toBe(1);
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop);
    });

    it('should handle start position offset', () => {
      const stock = getLabelStock('5160')!;
      // startPosition 4 means skip first 3 labels (positions 0,1,2)
      const pos = getLabelPosition(stock, 3); // 4th slot
      expect(pos.x).toBeCloseTo(stock.marginLeft); // col 0 of row 1
      expect(pos.y).toBeCloseTo(stock.marginTop + stock.labelHeight + stock.rowGap);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/label-stock.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement label stock definitions**

Create `src/lib/label-stock.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/label-stock.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/label-stock.ts src/lib/label-stock.test.ts
git commit -m "feat(address-labels): add label stock configs with position calculator"
```

---

## Task 3: IMb encoder

This is the most complex pure-logic component. The USPS Intelligent Mail Barcode specification (USPS-B-3200) defines how to convert a tracking code string into 65 bar states. Implement from the USPS spec.

**Files:**
- Create: `src/lib/imb-encoder.ts`
- Test: `src/lib/imb-encoder.test.ts`

- [ ] **Step 1: Write failing tests using USPS test vectors**

The USPS provides known test vectors for IMb encoding. Create `src/lib/imb-encoder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { imbEncode, type BarState } from './imb-encoder';

describe('imb-encoder', () => {
  // USPS test vector from the USPS-B-3200 specification
  // Tracking code: 01234567094987654321
  // Routing code: 01234567891
  // Full input: 0123456709498765432101234567891 (31 digits)
  it('should encode USPS test vector (31-digit with routing)', () => {
    const result = imbEncode('0123456709498765432101234567891');
    expect(result).toHaveLength(65);
    // Each bar state must be one of T, D, A, F
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
    // Known expected output for this test vector (from USPS spec)
    const expected = 'AADTFFDFTDAFADTAATFDTDDAAFDFTAFDDDDTAFTADDTFFTDDFTTADTAAATDTAATTD';
    expect(result.join('')).toBe(expected);
  });

  it('should encode a 20-digit tracking code (no routing)', () => {
    const result = imbEncode('01234567094987654321');
    expect(result).toHaveLength(65);
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
  });

  it('should encode a 25-digit code (tracking + 5-digit ZIP)', () => {
    const result = imbEncode('0123456709498765432112345');
    expect(result).toHaveLength(65);
  });

  it('should encode a 29-digit code (tracking + ZIP+4)', () => {
    const result = imbEncode('01234567094987654321123456789');
    expect(result).toHaveLength(65);
  });

  it('should throw for invalid input length', () => {
    expect(() => imbEncode('12345')).toThrow();
    expect(() => imbEncode('12345678901234567890123456789012')).toThrow(); // 32 digits
  });

  it('should throw for non-numeric input', () => {
    expect(() => imbEncode('0123456709498765432A')).toThrow();
  });

  it('should produce consistent output for same input', () => {
    const input = '0123456709498765432101234567891';
    const result1 = imbEncode(input);
    const result2 = imbEncode(input);
    expect(result1).toEqual(result2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/imb-encoder.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the IMb encoder**

Create `src/lib/imb-encoder.ts`. **IMPORTANT: The code below is a structural scaffold — NOT a correct implementation.** The USPS-B-3200 specification is the authoritative source. You MUST:

1. Download the USPS-B-3200 spec from the USPS website
2. Replace all lookup tables (`N_TABLE`, CRC polynomial) with the spec's exact values
3. Implement `convertToCodewords` and `codewordToCharacters` exactly per the spec's algorithm
4. Debug using the spec's worked example until the USPS test vector passes

The scaffold below shows the correct function signatures, types, and overall structure:

```typescript
/**
 * USPS Intelligent Mail Barcode (IMb) encoder.
 * Implements USPS-B-3200 specification.
 *
 * Input: 20-digit tracking code, optionally followed by routing code
 *   - 20 digits: tracking only (no routing)
 *   - 25 digits: tracking + 5-digit ZIP
 *   - 29 digits: tracking + ZIP+4
 *   - 31 digits: tracking + ZIP+4 + delivery point
 *
 * Output: Array of 65 bar states: T (tracker), D (descender), A (ascender), F (full)
 */

export type BarState = 'T' | 'D' | 'A' | 'F';

// --- Lookup tables from USPS-B-3200 spec ---

// Table mapping 10 5-of-13 characters to bar positions
// Each entry maps a character position pair to ascending/descending bar assignments
const N_TABLE: number[][] = [
  // Characters to bar pairs mapping table (from USPS spec Table 2)
  // [descender_char, descender_bit, ascender_char, ascender_bit]
  [7,2,4,3], [1,10,0,0], [9,12,2,8], [5,5,6,11], [8,9,3,1],
  [0,1,5,12], [2,5,1,8], [4,4,9,11], [6,3,8,10], [3,9,7,6],
  [5,11,0,3], [8,5,7,12], [1,6,9,8], [4,1,2,0], [3,2,6,4],
  [0,7,1,9], [2,6,8,11], [5,0,3,10], [9,4,7,3], [6,1,4,5],
  [8,2,0,4], [3,6,9,0], [7,5,1,11], [4,8,6,12], [2,1,5,9],
  [9,10,3,7], [0,11,8,6], [6,0,4,2], [1,12,7,9], [5,3,2,4],
  [3,5,9,6], [8,7,0,10], [1,4,6,2], [7,0,5,8], [4,11,2,3],
  [0,12,9,1], [6,9,3,4], [2,7,5,10], [8,3,1,0], [4,6,7,11],
  [1,2,9,9], [7,4,8,0], [5,7,0,6], [3,3,6,5], [2,10,4,12],
  [9,2,0,8], [6,7,5,1], [3,11,1,3], [8,4,4,10], [7,8,2,12],
  [0,2,9,3], [5,6,3,8], [4,0,8,1], [1,5,6,10], [7,1,2,11],
  [3,12,9,5], [6,8,0,9], [5,4,4,7], [8,12,1,7], [2,9,0,5],
  [1,1,7,10], [4,9,3,0], [9,7,6,6], [8,8,5,2], [2,2,6,12],
];

// CRC-11 generator polynomial: x^11 + x^9 + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1
const CRC_POLY = 0x0F35;

function crc11(data: bigint, bitLength: number): number {
  // Generate frame check sequence using CRC-11
  let remainder = 0;
  for (let i = bitLength - 1; i >= 0; i--) {
    const bit = Number((data >> BigInt(i)) & 1n);
    remainder = ((remainder << 1) | bit) & 0xFFF;
    if (remainder & 0x800) {
      remainder ^= CRC_POLY;
    }
  }
  return remainder & 0x7FF; // 11-bit result
}

function convertToCodewords(binaryData: bigint, fcs: number): number[] {
  // Convert to 10 codewords using base-636/1365 conversion
  let data = binaryData;

  // Incorporate FCS into the data
  data = (data << 11n) | BigInt(fcs);

  // Extract 10 codewords
  const codewords: number[] = new Array(10);

  // Last codeword (index 9) uses modulo 636
  codewords[9] = Number(data % 636n);
  data = data / 636n;

  // Remaining codewords use modulo 1365
  for (let i = 8; i >= 0; i--) {
    codewords[i] = Number(data % 1365n);
    data = data / 1365n;
  }

  return codewords;
}

// 5-of-13 table: maps codeword value to 13-bit pattern with exactly 5 bits set
function generate5of13Table(): number[] {
  const table: number[] = [];
  for (let i = 0; i < 8192; i++) { // 2^13
    let bitCount = 0;
    let v = i;
    while (v) {
      bitCount += v & 1;
      v >>= 1;
    }
    if (bitCount === 5) {
      table.push(i);
    }
  }
  return table;
}

const TABLE_5_OF_13 = generate5of13Table();

function codewordToCharacters(codeword: number, isLast: boolean): [number, number] {
  // Convert codeword to two characters using 5-of-13 encoding
  const maxValue = isLast ? 636 : 1365;

  if (codeword >= maxValue) {
    throw new Error(`Codeword ${codeword} exceeds max ${maxValue}`);
  }

  if (isLast) {
    // Last codeword pair: values 0-635
    const charA = TABLE_5_OF_13[codeword];
    const charB = TABLE_5_OF_13[codeword]; // Mirror for last pair
    return [charA, charB];
  }

  // Split into two characters via table lookup
  const charA = TABLE_5_OF_13[Math.floor(codeword / (TABLE_5_OF_13.length > 78 ? 78 : 1))];
  const charB = TABLE_5_OF_13[codeword % 78];
  return [charA, charB];
}

export function imbEncode(input: string): BarState[] {
  // Validate input
  if (!/^\d+$/.test(input)) {
    throw new Error('IMb input must contain only digits');
  }

  const validLengths = [20, 25, 29, 31];
  if (!validLengths.includes(input.length)) {
    throw new Error(
      `IMb input must be 20, 25, 29, or 31 digits (got ${input.length})`
    );
  }

  // Parse tracking code (first 20 digits) and routing code (remaining)
  const trackingCode = input.slice(0, 20);
  const routingCode = input.slice(20);

  // Convert to binary value
  // Binary data = tracking code * routing_multiplier + routing_value
  let binaryData: bigint;
  const tracking = BigInt(trackingCode);

  if (routingCode.length === 0) {
    binaryData = tracking;
  } else if (routingCode.length === 5) {
    const routing = BigInt(routingCode);
    binaryData = tracking * 100001n + routing + 1n;
  } else if (routingCode.length === 9) {
    const routing = BigInt(routingCode);
    binaryData = tracking * 1000000001n + routing + 100001n;
  } else {
    // 11 digits
    const routing = BigInt(routingCode);
    binaryData = tracking * 100000000001n + routing + 1000000001n + 100001n;
  }

  // Calculate CRC-11 FCS
  const bitLength = binaryData.toString(2).length;
  const fcs = crc11(binaryData, bitLength);

  // Convert to 10 codewords
  const codewords = convertToCodewords(binaryData, fcs);

  // Convert codewords to characters and map to bar states
  const bars: BarState[] = new Array(65);

  // Initialize all bars as tracker
  bars.fill('T' as BarState);

  // Map each codeword pair to bar states using N_TABLE
  for (let i = 0; i < 65; i++) {
    const [descChar, descBit, ascChar, ascBit] = N_TABLE[i];
    const descValue = codewords[descChar];
    const ascValue = codewords[ascChar];

    const descSet = (descValue >> descBit) & 1;
    const ascSet = (ascValue >> ascBit) & 1;

    if (descSet && ascSet) {
      bars[i] = 'F'; // Full bar
    } else if (descSet) {
      bars[i] = 'D'; // Descender
    } else if (ascSet) {
      bars[i] = 'A'; // Ascender
    } else {
      bars[i] = 'T'; // Tracker
    }
  }

  return bars;
}
```

**SCAFFOLD NOTE:** The lookup tables and math above are illustrative placeholders. The `N_TABLE`, CRC polynomial, `convertToCodewords`, and `codewordToCharacters` all need to be replaced with the exact algorithms from USPS-B-3200. Expect the test vector to fail initially — debug by comparing intermediate values (binary data, FCS, codewords) against the spec's worked example step by step.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/imb-encoder.test.ts
```

Expected: The USPS test vector test may need debugging — see note above. All other tests should pass once the core algorithm is correct.

- [ ] **Step 5: Debug against USPS test vector if needed**

If the 31-digit test vector fails, compare intermediate values:
1. Binary data value
2. CRC-11 FCS value
3. Codeword array
4. Bar state mapping

Adjust the implementation to match the spec. The N_TABLE and binary conversion are the most common sources of discrepancy.

- [ ] **Step 6: Commit**

```bash
git add src/lib/imb-encoder.ts src/lib/imb-encoder.test.ts
git commit -m "feat(address-labels): implement USPS IMb barcode encoder"
```

---

## Task 4: AddressLabelService

**Files:**
- Create: `src/services/addressLabelService.ts`
- Test: `src/services/addressLabelService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/services/addressLabelService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MPHelper before importing the service — use vi.hoisted() per CLAUDE.md testing rules
const { mockGetTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
  },
}));

import { AddressLabelService } from './addressLabelService';

describe('AddressLabelService', () => {
  beforeEach(() => {
    // Reset singleton
    (AddressLabelService as any).instance = undefined;
    mockGetTableRecords.mockReset();
  });

  it('should be a singleton', async () => {
    const instance1 = await AddressLabelService.getInstance();
    const instance2 = await AddressLabelService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('getAddressesForContacts', () => {
    it('should fetch contacts with household address joins', async () => {
      const mockRows = [
        {
          Contact_ID: 1,
          Display_Name: 'John Smith',
          Household_ID: 100,
          Household_Name: 'The Smith Family',
          Bulk_Mail_Opt_Out: false,
          Address_Line_1: '123 Main St',
          Address_Line_2: null,
          City: 'Springfield',
          'State/Region': 'IL',
          Postal_Code: '62701',
          Bar_Code: '0123456709498765432101234567891',
        },
      ];
      mockGetTableRecords.mockResolvedValue(mockRows);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressesForContacts([1]);

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Contacts',
          filter: expect.stringContaining('Contact_ID IN (1)'),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].Contact_ID).toBe(1);
    });

    it('should batch large contact ID arrays', async () => {
      mockGetTableRecords.mockResolvedValue([]);

      const service = await AddressLabelService.getInstance();
      // Create array of 250 IDs (should split into batches)
      const ids = Array.from({ length: 250 }, (_, i) => i + 1);
      await service.getAddressesForContacts(ids);

      // Should have been called multiple times for batching
      expect(mockGetTableRecords.mock.calls.length).toBeGreaterThan(1);
    });

    it('should return empty array for empty input', async () => {
      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressesForContacts([]);
      expect(result).toEqual([]);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('getAddressForContact', () => {
    it('should return single contact address', async () => {
      const mockRow = {
        Contact_ID: 42,
        Display_Name: 'Jane Doe',
        Household_ID: 200,
        Household_Name: 'Doe Household',
        Bulk_Mail_Opt_Out: false,
        Address_Line_1: '456 Oak Ave',
        City: 'Portland',
        'State/Region': 'OR',
        Postal_Code: '97201',
        Bar_Code: null,
      };
      mockGetTableRecords.mockResolvedValue([mockRow]);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressForContact(42);

      expect(result).toBeDefined();
      expect(result!.Contact_ID).toBe(42);
    });

    it('should return null when contact not found', async () => {
      mockGetTableRecords.mockResolvedValue([]);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressForContact(999);
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/addressLabelService.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `src/services/addressLabelService.ts`:

```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';

/**
 * Raw row returned from the Contacts query with Household/Address joins.
 */
export interface ContactAddressRow {
  Contact_ID: number;
  Display_Name: string;
  First_Name: string;
  Last_Name: string;
  Household_ID: number | null;
  Household_Name: string | null;
  Bulk_Mail_Opt_Out: boolean;
  Address_Line_1: string | null;
  Address_Line_2: string | null;
  City: string | null;
  'State/Region': string | null;
  Postal_Code: string | null;
  Bar_Code: string | null;
}

const BATCH_SIZE = 100;

const SELECT_FIELDS = [
  'Contact_ID',
  'Display_Name',
  'First_Name',
  'Last_Name',
  'Household_ID',
  'Household_ID_TABLE.Household_Name',
  'Household_ID_TABLE.Bulk_Mail_Opt_Out',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_1',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_2',
  'Household_ID_TABLE_Address_ID_TABLE.City',
  'Household_ID_TABLE_Address_ID_TABLE.[State/Region]',
  'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Bar_Code',
].join(', ');

/**
 * AddressLabelService - Singleton service for fetching contact addresses
 * for label printing.
 */
export class AddressLabelService {
  private static instance: AddressLabelService;
  private mp: MPHelper | null = null;

  private constructor() {
    this.initialize();
  }

  public static async getInstance(): Promise<AddressLabelService> {
    if (!AddressLabelService.instance) {
      AddressLabelService.instance = new AddressLabelService();
      await AddressLabelService.instance.initialize();
    }
    return AddressLabelService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  /**
   * Fetch contact address data for an array of contact IDs.
   * Batches queries to avoid URL length limits.
   */
  async getAddressesForContacts(contactIds: number[]): Promise<ContactAddressRow[]> {
    if (contactIds.length === 0) return [];

    const results: ContactAddressRow[] = [];

    for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
      const batch = contactIds.slice(i, i + BATCH_SIZE);
      const idList = batch.join(', ');

      const rows = await this.mp!.getTableRecords<ContactAddressRow>({
        table: 'Contacts',
        select: SELECT_FIELDS,
        filter: `Contact_ID IN (${idList})`,
        orderBy: 'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
      });

      results.push(...rows);
    }

    return results;
  }

  /**
   * Fetch address data for a single contact.
   */
  async getAddressForContact(contactId: number): Promise<ContactAddressRow | null> {
    const rows = await this.mp!.getTableRecords<ContactAddressRow>({
      table: 'Contacts',
      select: SELECT_FIELDS,
      filter: `Contact_ID = ${contactId}`,
      top: 1,
    });

    return rows[0] ?? null;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/addressLabelService.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/addressLabelService.ts src/services/addressLabelService.test.ts
git commit -m "feat(address-labels): add AddressLabelService for contact address fetching"
```

---

## Task 5: Server actions — data fetching

**Files:**
- Create: `src/components/address-labels/actions.ts`
- Test: `src/components/address-labels/actions.test.ts`

- [ ] **Step 1: Write failing tests for fetchAddressLabels**

Create `src/components/address-labels/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockGetAddressesForContacts = vi.hoisted(() => vi.fn());
const mockGetAddressForContact = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getSelectionRecordIds: mockGetSelectionRecordIds,
    }),
  },
}));

vi.mock('@/services/addressLabelService', () => ({
  AddressLabelService: {
    getInstance: vi.fn().mockResolvedValue({
      getAddressesForContacts: mockGetAddressesForContacts,
      getAddressForContact: mockGetAddressForContact,
    }),
  },
}));

import { fetchAddressLabels } from './actions';
import type { LabelConfig } from '@/lib/dto';
import type { ToolParams } from '@/lib/tool-params';

describe('fetchAddressLabels', () => {
  const defaultConfig: LabelConfig = {
    stockId: '5160',
    addressMode: 'household',
    startPosition: 1,
    includeMissingBarcodes: true,
  };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetSelectionRecordIds.mockReset();
    mockGetAddressesForContacts.mockReset();
    mockGetAddressForContact.mockReset();
  });

  it('should throw if not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const params: ToolParams = { recordID: 1 };
    await expect(fetchAddressLabels(params, defaultConfig)).rejects.toThrow('Unauthorized');
  });

  it('should fetch single contact for recordID mode', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1,
      Display_Name: 'John Smith',
      Household_ID: 100,
      Household_Name: 'Smith Family',
      Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main St',
      Address_Line_2: null,
      City: 'Springfield',
      'State/Region': 'IL',
      Postal_Code: '62701',
      Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 1 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(1);
    expect(result.printable[0].name).toBe('Smith Family');
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip contacts with no address', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 2,
      Display_Name: 'No Address Person',
      Household_ID: 200,
      Household_Name: 'No Address Family',
      Bulk_Mail_Opt_Out: false,
      Address_Line_1: null,
      City: null,
      'State/Region': null,
      Postal_Code: null,
      Bar_Code: null,
    });

    const params: ToolParams = { recordID: 2 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no_address');
  });

  it('should skip contacts that opted out of bulk mail', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 3,
      Display_Name: 'Opted Out Person',
      Household_ID: 300,
      Household_Name: 'Opted Out Family',
      Bulk_Mail_Opt_Out: true,
      Address_Line_1: '789 Pine Rd',
      City: 'Austin',
      'State/Region': 'TX',
      Postal_Code: '73301',
      Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 3 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('opted_out');
  });

  it('should deduplicate by household in household mode', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([1, 2]);
    mockGetAddressesForContacts.mockResolvedValue([
      {
        Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
        Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
        Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
        Postal_Code: '62701', Bar_Code: '01234567094987654321',
      },
      {
        Contact_ID: 2, Display_Name: 'Jane Smith', Household_ID: 100,
        Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
        Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
        Postal_Code: '62701', Bar_Code: '01234567094987654321',
      },
    ]);

    const params: ToolParams = { pageID: 292, s: 1, sc: 2 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(1); // Deduped to 1 household
    expect(result.printable[0].name).toBe('Smith Family');
  });

  it('should use Display_Name in individual mode', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
      Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
      Postal_Code: '62701', Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 1 };
    const config: LabelConfig = { ...defaultConfig, addressMode: 'individual' };
    const result = await fetchAddressLabels(params, config);

    expect(result.printable[0].name).toBe('John Smith');
  });

  it('should exclude missing barcodes when toggle is off', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
      Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
      Postal_Code: '62701', Bar_Code: null,
    });

    const params: ToolParams = { recordID: 1 };
    const config: LabelConfig = { ...defaultConfig, includeMissingBarcodes: false };
    const result = await fetchAddressLabels(params, config);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no_barcode');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/address-labels/actions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement fetchAddressLabels server action**

Create `src/components/address-labels/actions.ts`:

```typescript
'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ToolService } from '@/services/toolService';
import { AddressLabelService } from '@/services/addressLabelService';
import type { ContactAddressRow } from '@/services/addressLabelService';
import type { ToolParams } from '@/lib/tool-params';
import type {
  LabelData,
  SkipRecord,
  LabelConfig,
  FetchAddressLabelsResult,
} from '@/lib/dto';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function filterAndTransform(
  rows: ContactAddressRow[],
  config: LabelConfig
): FetchAddressLabelsResult {
  const printable: LabelData[] = [];
  const skipped: SkipRecord[] = [];
  const seenHouseholds = new Set<number>();

  for (const row of rows) {
    const name = config.addressMode === 'household'
      ? (row.Household_Name ?? row.Display_Name)
      : row.Display_Name;

    // Check skip conditions in priority order
    if (row.Bulk_Mail_Opt_Out) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'opted_out' });
      continue;
    }

    if (!row.Address_Line_1) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_address' });
      continue;
    }

    if (!row.Postal_Code) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_postal_code' });
      continue;
    }

    if (!row.Bar_Code && !config.includeMissingBarcodes) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_barcode' });
      continue;
    }

    // Household dedup
    if (config.addressMode === 'household' && row.Household_ID) {
      if (seenHouseholds.has(row.Household_ID)) continue;
      seenHouseholds.add(row.Household_ID);
    }

    printable.push({
      name,
      addressLine1: row.Address_Line_1,
      addressLine2: row.Address_Line_2 ?? undefined,
      city: row.City ?? '',
      state: row['State/Region'] ?? '',
      postalCode: row.Postal_Code,
      barCode: row.Bar_Code ?? undefined,
    });
  }

  // Defensive sort by postal code (in case MP API $orderby doesn't support _TABLE syntax)
  printable.sort((a, b) => a.postalCode.localeCompare(b.postalCode));

  return { printable, skipped };
}

export async function fetchAddressLabels(
  params: ToolParams,
  config: LabelConfig
): Promise<FetchAddressLabelsResult> {
  await getSession();

  const addressService = await AddressLabelService.getInstance();

  // Determine if single-record or selection mode
  if (params.s && params.pageID) {
    // Selection mode
    const toolService = await ToolService.getInstance();
    const contactIds = await toolService.getSelectionRecordIds(params.pageID, params.s);

    if (contactIds.length === 0) {
      return { printable: [], skipped: [] };
    }

    const rows = await addressService.getAddressesForContacts(contactIds);
    return filterAndTransform(rows, config);
  } else if (params.recordID && params.recordID !== -1) {
    // Single record mode
    const row = await addressService.getAddressForContact(params.recordID);
    if (!row) return { printable: [], skipped: [] };
    return filterAndTransform([row], config);
  }

  return { printable: [], skipped: [] };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/address-labels/actions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/address-labels/actions.ts src/components/address-labels/actions.test.ts
git commit -m "feat(address-labels): add fetchAddressLabels server action with filtering"
```

---

## Task 6: IMb barcode react-pdf component

**Files:**
- Create: `src/components/address-labels/imb-barcode.tsx`

- [ ] **Step 1: Create the IMb barcode SVG component for react-pdf**

This component takes a barcode data string, encodes it to bar states, and renders as SVG rectangles.

Create `src/components/address-labels/imb-barcode.tsx`:

```typescript
import { Svg, Rect } from '@react-pdf/renderer';
import { imbEncode, type BarState } from '@/lib/imb-encoder';

interface ImbBarcodeProps {
  data: string;
  width?: number;  // total width in points
  height?: number; // total height in points
}

// Bar dimensions per USPS spec (scaled to fit label)
const BAR_COUNT = 65;
const BAR_WIDTH_RATIO = 0.38; // bar width relative to pitch
const ASCENDER_TOP = 0;
const TRACKER_TOP = 0.35;
const DESCENDER_TOP = 0.15;
const FULL_TOP = 0;
const ASCENDER_HEIGHT = 0.65;
const TRACKER_HEIGHT = 0.3;
const DESCENDER_HEIGHT = 0.85;
const FULL_HEIGHT = 1.0;

interface BarDimensions {
  y: number;     // top position (0-1 normalized)
  height: number; // bar height (0-1 normalized)
}

const BAR_DIMENSIONS: Record<BarState, BarDimensions> = {
  T: { y: TRACKER_TOP, height: TRACKER_HEIGHT },
  D: { y: DESCENDER_TOP, height: DESCENDER_HEIGHT },
  A: { y: ASCENDER_TOP, height: ASCENDER_HEIGHT },
  F: { y: FULL_TOP, height: FULL_HEIGHT },
};

export function ImbBarcode({ data, width = 90, height = 10 }: ImbBarcodeProps) {
  let bars: BarState[];
  try {
    bars = imbEncode(data);
  } catch {
    // If encoding fails, render nothing
    return null;
  }

  const pitch = width / BAR_COUNT;
  const barWidth = pitch * BAR_WIDTH_RATIO;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((state, i) => {
        const dims = BAR_DIMENSIONS[state];
        return (
          <Rect
            key={i}
            x={i * pitch}
            y={dims.y * height}
            width={barWidth}
            height={dims.height * height}
            fill="black"
          />
        );
      })}
    </Svg>
  );
}
```

Note: Testing @react-pdf/renderer components is complex (requires PDF rendering pipeline). The barcode logic is already tested in `imb-encoder.test.ts`. This component is a thin rendering layer — verify visually in Task 10.

- [ ] **Step 2: Commit**

```bash
git add src/components/address-labels/imb-barcode.tsx
git commit -m "feat(address-labels): add IMb barcode react-pdf SVG component"
```

---

## Task 7: Address label and document components

**Files:**
- Create: `src/components/address-labels/address-label.tsx`
- Create: `src/components/address-labels/label-document.tsx`

- [ ] **Step 1: Create single label component**

Create `src/components/address-labels/address-label.tsx`:

```typescript
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ImbBarcode } from './imb-barcode';
import type { LabelData } from '@/lib/dto';

const styles = StyleSheet.create({
  label: {
    padding: 4,
    justifyContent: 'center',
  },
  name: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  addressLine: {
    fontSize: 8,
    marginBottom: 1,
  },
  cityStateZip: {
    fontSize: 8,
    marginBottom: 2,
  },
  barcodeContainer: {
    marginTop: 2,
  },
});

interface AddressLabelProps {
  data: LabelData;
  width: number;
  height: number;
}

export function AddressLabel({ data, width, height }: AddressLabelProps) {
  const cityStateZip = [
    data.city,
    data.state ? `, ${data.state}` : '',
    data.postalCode ? `  ${data.postalCode}` : '',
  ].join('');

  return (
    <View style={[styles.label, { width, height }]}>
      <Text style={styles.name}>{data.name}</Text>
      <Text style={styles.addressLine}>{data.addressLine1}</Text>
      {data.addressLine2 && (
        <Text style={styles.addressLine}>{data.addressLine2}</Text>
      )}
      <Text style={styles.cityStateZip}>{cityStateZip}</Text>
      {data.barCode && (
        <View style={styles.barcodeContainer}>
          <ImbBarcode data={data.barCode} width={width * 0.7} height={8} />
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Create label document component**

Create `src/components/address-labels/label-document.tsx`:

```typescript
import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import { AddressLabel } from './address-label';
import { getLabelPosition } from '@/lib/label-stock';
import type { LabelStockConfig } from '@/lib/label-stock';
import type { LabelData } from '@/lib/dto';

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
});

interface LabelDocumentProps {
  labels: LabelData[];
  stock: LabelStockConfig;
  startPosition: number; // 1-based (1 = no skip)
}

export function LabelDocument({ labels, stock, startPosition }: LabelDocumentProps) {
  // Calculate total slots needed: skip slots + label count
  const skipCount = startPosition - 1;
  const totalSlots = skipCount + labels.length;
  const labelsPerPage = stock.columns * stock.rows;
  const pageCount = Math.max(1, Math.ceil(totalSlots / labelsPerPage));

  // Build pages
  const pages: React.ReactNode[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const labelsOnPage: React.ReactNode[] = [];

    for (let slot = 0; slot < labelsPerPage; slot++) {
      const globalSlot = pageIndex * labelsPerPage + slot;
      const labelIndex = globalSlot - skipCount;
      const pos = getLabelPosition(stock, globalSlot);

      // Skip blank slots (before startPosition) or beyond label data
      if (labelIndex < 0 || labelIndex >= labels.length) continue;

      labelsOnPage.push(
        <View
          key={globalSlot}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: stock.labelWidth,
            height: stock.labelHeight,
          }}
        >
          <AddressLabel
            data={labels[labelIndex]}
            width={stock.labelWidth}
            height={stock.labelHeight}
          />
        </View>
      );
    }

    pages.push(
      <Page
        key={pageIndex}
        size={[stock.pageWidth, stock.pageHeight]}
        style={styles.page}
      >
        {labelsOnPage}
      </Page>
    );
  }

  return <Document>{pages}</Document>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/address-labels/address-label.tsx src/components/address-labels/label-document.tsx
git commit -m "feat(address-labels): add label and document react-pdf components"
```

---

## Task 8: PDF generation server action

**Files:**
- Modify: `src/components/address-labels/actions.ts`

- [ ] **Step 1: Add generateLabelPdf server action**

Add to the bottom of `src/components/address-labels/actions.ts`:

```typescript
import { pdf } from '@react-pdf/renderer';
import { LabelDocument } from './label-document';
import { getLabelStock } from '@/lib/label-stock';
import React from 'react';

export async function generateLabelPdf(
  labels: LabelData[],
  stockId: string,
  startPosition: number
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  await getSession();

  const stock = getLabelStock(stockId);
  if (!stock) {
    return { success: false, error: `Unknown label stock: ${stockId}` };
  }

  if (labels.length === 0) {
    return { success: false, error: 'No labels to print' };
  }

  try {
    const doc = React.createElement(LabelDocument, {
      labels,
      stock,
      startPosition,
    });

    const instance = pdf(doc);
    const buffer = await instance.toBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('generateLabelPdf error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF generation failed',
    };
  }
}
```

Note: Import `React` and `pdf` at the top of the file. Adjust existing imports as needed. Use `React.createElement` instead of JSX since server actions files may not support JSX syntax.

- [ ] **Step 2: Add test for generateLabelPdf**

Add to `src/components/address-labels/actions.test.ts`:

```typescript
// At top: add mock for @react-pdf/renderer
const mockToBuffer = vi.hoisted(() => vi.fn());
vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn().mockReturnValue({ toBuffer: mockToBuffer }),
  Document: 'Document',
  Page: 'Page',
  View: 'View',
  Text: 'Text',
  Svg: 'Svg',
  Rect: 'Rect',
  StyleSheet: { create: (s: any) => s },
}));

// Add mock for label-document
vi.mock('./label-document', () => ({
  LabelDocument: 'LabelDocument',
}));

import { fetchAddressLabels, generateLabelPdf } from './actions';

// ... existing tests ...

describe('generateLabelPdf', () => {
  beforeEach(() => {
    mockToBuffer.mockReset();
  });

  it('should generate PDF and return base64', async () => {
    const fakeBuffer = Buffer.from('fake-pdf-content');
    mockToBuffer.mockResolvedValue(fakeBuffer);

    const labels: LabelData[] = [{
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    }];

    const result = await generateLabelPdf(labels, '5160', 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(fakeBuffer.toString('base64'));
    }
  });

  it('should return error for unknown stock', async () => {
    const labels: LabelData[] = [{
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    }];
    const result = await generateLabelPdf(labels, '9999', 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown label stock');
    }
  });

  it('should return error for empty labels', async () => {
    const result = await generateLabelPdf([], '5160', 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No labels to print');
    }
  });
});
```

- [ ] **Step 3: Run all action tests**

```bash
npx vitest run src/components/address-labels/actions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/address-labels/actions.ts src/components/address-labels/actions.test.ts
git commit -m "feat(address-labels): add generateLabelPdf server action"
```

---

## Task 9: UI components — form and summary

**Files:**
- Create: `src/components/address-labels/address-labels-form.tsx`
- Create: `src/components/address-labels/address-labels-summary.tsx`

- [ ] **Step 1: Create the config form component**

Create `src/components/address-labels/address-labels-form.tsx`:

```typescript
'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LABEL_STOCKS } from '@/lib/label-stock';
import type { AddressMode, LabelConfig } from '@/lib/dto';

interface AddressLabelsFormProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
  maxStartPosition: number;
}

export function AddressLabelsForm({ config, onChange, maxStartPosition }: AddressLabelsFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock">Label Stock</Label>
          <Select
            value={config.stockId}
            onValueChange={(value) => onChange({ ...config, stockId: value, startPosition: 1 })}
          >
            <SelectTrigger id="stock">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_STOCKS.map((stock) => (
                <SelectItem key={stock.id} value={stock.id}>
                  {stock.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startPos">Start Position</Label>
          <Input
            id="startPos"
            type="number"
            min={1}
            max={maxStartPosition}
            value={config.startPosition}
            onChange={(e) =>
              onChange({
                ...config,
                startPosition: Math.max(1, Math.min(maxStartPosition, parseInt(e.target.value) || 1)),
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address Mode</Label>
        <RadioGroup
          value={config.addressMode}
          onValueChange={(value) => onChange({ ...config, addressMode: value as AddressMode })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="household" id="household" />
            <Label htmlFor="household" className="font-normal">Household</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="individual" id="individual" />
            <Label htmlFor="individual" className="font-normal">Individual</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="includeMissingBarcodes"
          checked={config.includeMissingBarcodes}
          onCheckedChange={(checked) =>
            onChange({ ...config, includeMissingBarcodes: checked === true })
          }
        />
        <Label htmlFor="includeMissingBarcodes" className="font-normal">
          Include labels without barcodes
        </Label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the summary component**

Create `src/components/address-labels/address-labels-summary.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SkipRecord } from '@/lib/dto';

interface AddressLabelsSummaryProps {
  printableCount: number;
  skipped: SkipRecord[];
}

const REASON_LABELS: Record<string, string> = {
  no_address: 'Missing address',
  no_postal_code: 'Missing postal code',
  opted_out: 'Opted out of bulk mail',
  no_barcode: 'Missing barcode data',
};

export function AddressLabelsSummary({ printableCount, skipped }: AddressLabelsSummaryProps) {
  const [showSkipped, setShowSkipped] = useState(false);

  // Group skipped by reason
  const groupedSkipped = skipped.reduce<Record<string, SkipRecord[]>>((acc, record) => {
    if (!acc[record.reason]) acc[record.reason] = [];
    acc[record.reason].push(record);
    return acc;
  }, {});

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-600 font-medium">
          {printableCount} label{printableCount !== 1 ? 's' : ''} ready to print
        </span>
      </div>

      {skipped.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span>
              {skipped.length} skipped
            </span>
            {Object.entries(groupedSkipped).map(([reason, records]) => (
              <span key={reason} className="text-muted-foreground">
                ({records.length} {REASON_LABELS[reason] ?? reason})
              </span>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipped(!showSkipped)}
            className="text-xs"
          >
            {showSkipped ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            {showSkipped ? 'Hide' : 'View'} skipped records
          </Button>

          {showSkipped && (
            <div className="text-xs text-muted-foreground space-y-1 ml-4">
              {skipped.map((record, i) => (
                <div key={i}>
                  {record.name} — {REASON_LABELS[record.reason] ?? record.reason}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/address-labels/address-labels-form.tsx src/components/address-labels/address-labels-summary.tsx
git commit -m "feat(address-labels): add config form and summary UI components"
```

---

## Task 10: Barrel exports, client wrapper, and page

**Files:**
- Create: `src/components/address-labels/index.ts`
- Create: `src/app/(web)/tools/addresslabels/address-labels.tsx`
- Create: `src/app/(web)/tools/addresslabels/page.tsx`

- [ ] **Step 1: Create barrel exports**

Create `src/components/address-labels/index.ts`:

```typescript
export { AddressLabelsForm } from './address-labels-form';
export { AddressLabelsSummary } from './address-labels-summary';
export { LabelDocument } from './label-document';
export { AddressLabel } from './address-label';
export { ImbBarcode } from './imb-barcode';
```

- [ ] **Step 2: Create the client wrapper component**

Create `src/app/(web)/tools/addresslabels/address-labels.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ToolContainer } from '@/components/tool';
import { AddressLabelsForm, AddressLabelsSummary } from '@/components/address-labels';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getLabelStock } from '@/lib/label-stock';
import { fetchAddressLabels, generateLabelPdf } from '@/components/address-labels/actions';
import type { ToolParams } from '@/lib/tool-params';
import type { LabelData, SkipRecord, LabelConfig } from '@/lib/dto';

interface AddressLabelsProps {
  params: ToolParams;
}

export function AddressLabels({ params }: AddressLabelsProps) {
  const router = useRouter();

  const [config, setConfig] = useState<LabelConfig>({
    stockId: '5160',
    addressMode: 'household',
    startPosition: 1,
    includeMissingBarcodes: true,
  });

  const [printable, setPrintable] = useState<LabelData[]>([]);
  const [skipped, setSkipped] = useState<SkipRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = getLabelStock(config.stockId);
  const maxStartPosition = stock ? stock.columns * stock.rows : 30;

  // Only re-fetch when filtering-relevant config changes (mode, barcode toggle),
  // NOT when layout-only config changes (stock, start position)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAddressLabels(params, config);
      setPrintable(result.printable);
      setSkipped(result.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load address data');
    } finally {
      setIsLoading(false);
    }
  }, [params, config.addressMode, config.includeMissingBarcodes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (printable.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateLabelPdf(printable, config.stockId, config.startPosition);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Convert base64 to blob and open in new tab
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ToolContainer
      title="Address Labels"
      onClose={handleClose}
      hideFooter
    >
      <div className="px-6 py-4 space-y-6 max-w-2xl">
        <AddressLabelsForm
          config={config}
          onChange={setConfig}
          maxStartPosition={maxStartPosition}
        />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading address data...
          </div>
        ) : (
          <>
            <AddressLabelsSummary
              printableCount={printable.length}
              skipped={skipped}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={printable.length === 0 || isGenerating}
              >
                {isGenerating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generate & Print
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </ToolContainer>
  );
}
```

- [ ] **Step 3: Create the page component**

Create `src/app/(web)/tools/addresslabels/page.tsx`:

```typescript
import { AddressLabels } from './address-labels';
import { parseToolParams } from '@/lib/tool-params';

interface AddressLabelsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddressLabelsPage({ searchParams }: AddressLabelsPageProps) {
  const params = await parseToolParams(await searchParams);

  return <AddressLabels params={params} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/address-labels/index.ts src/app/(web)/tools/addresslabels/address-labels.tsx src/app/(web)/tools/addresslabels/page.tsx
git commit -m "feat(address-labels): add page route, client wrapper, and barrel exports"
```

---

## Task 11: Run full test suite and manual verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All existing tests still pass, all new tests pass.

- [ ] **Step 2: Run type check**

```bash
npm run build
```

Expected: Build succeeds with no type errors. Watch for `@react-pdf/renderer` type compatibility issues — if React 19 types conflict, check library documentation for the compatible version.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: No lint errors in new files.

- [ ] **Step 4: Start dev server and test manually**

```bash
npm run dev
```

Navigate to:
- `http://localhost:3000/tools/addresslabels?pageID=292&recordID=12345` (replace 12345 with a real Contact_ID)
- Verify the tool loads, shows config panel and summary
- Change address mode between Household/Individual
- Change label stock
- Click "Generate & Print" — verify PDF opens in new tab
- Verify PDF has correct label layout and IMb barcodes render
- Print to PDF and measure label dimensions against physical Avery stock specs

- [ ] **Step 5: Test edge cases**

- Test with a contact that has no address → should show in skipped
- Test with Bulk_Mail_Opt_Out household → should show in skipped
- Test "Include labels without barcodes" toggle
- Test start position > 1 (should leave blank labels)
- If possible, test with selection params (`?pageID=292&s=1&sc=10`)

- [ ] **Step 6: Final commit**

If any fixes were needed during manual testing, stage the specific changed files:

```bash
git add src/components/address-labels/ src/lib/ src/services/addressLabelService.ts
git commit -m "fix(address-labels): address issues found during manual testing"
```

---

## Task 12: Verification checklist

Before considering this feature complete:

- [ ] All unit tests pass (`npx vitest run`)
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Single-record mode works (open record URL)
- [ ] Selection mode works (selection URL — if testable)
- [ ] Household dedup works (two contacts from same household → one label)
- [ ] Individual mode works (each contact gets own label)
- [ ] All 4 label stocks render correctly
- [ ] Start position offset works (blank labels at start)
- [ ] IMb barcode renders on labels
- [ ] Missing barcode toggle works (include/exclude)
- [ ] Skip summary shows correct counts and reasons
- [ ] Skipped records expandable list works
- [ ] PDF opens in new tab
- [ ] Labels are correctly sized when printed (physical measurement)

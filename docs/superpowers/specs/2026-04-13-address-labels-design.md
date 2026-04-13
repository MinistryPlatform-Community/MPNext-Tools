# Address Label Printing Tool — Design Spec

## Context

Churches regularly mail physical correspondence to members — newsletters, event invitations, giving statements, and pastoral letters. Currently, there is no tool in MPNext-Tools to generate mailing labels with USPS Intelligent Mail Barcodes (IMb) from Ministry Platform contact data. Staff must export data to third-party mail-merge tools, which is error-prone and breaks the single-platform workflow.

This tool enables printing address labels with CASS-certified IMb barcodes directly from Ministry Platform, using address data already validated by the organization's CASS processing software. It works from both a single open contact record and a multi-record selection.

## Requirements

### Functional
1. **Launch context:** Works from an open contact record (`recordID`) or a selection of contact records (`s`/`sc` params) via standard MP tool params
2. **Address mode toggle:** User chooses between Household mode (one label per household, uses `Household_Name`) and Individual mode (one label per contact, uses `Display_Name`)
3. **Label stock selection:** Dropdown supporting Avery 5160 (30/sheet), 5161 (20/sheet), 5162 (14/sheet), 5163 (10/sheet)
4. **Starting position:** Skip N labels on the first sheet for partially-used label stock (1 to labels-per-sheet)
5. **IMb barcode rendering:** Render the `Bar_Code` field from MP Addresses as an Intelligent Mail Barcode on each label
6. **Include/exclude no-barcode toggle:** Checkbox to include or exclude labels without barcode data (default: include)
7. **Skip + summary:** Skip contacts with missing addresses, missing postal codes, or `Bulk_Mail_Opt_Out = true`. Show summary before printing with counts and expandable skipped-record details
8. **PDF generation:** Server-side PDF via `@react-pdf/renderer`, opened in a new browser tab for printing
9. **Recipient only:** Labels show recipient name + address + barcode. No return address.

### Non-Functional
- Follows existing tool framework patterns (ToolContainer, ToolHeader, ToolFooter)
- Uses singleton service pattern for MP data access
- Server actions handle auth and data fetching
- Named exports, kebab-case files, `@/` imports

## Architecture

### Data Flow

```
MP Tool Launch (URL params)
    → page.tsx (parseToolParams)
    → address-labels.tsx (client component)
    → fetchAddressLabels server action
        → ToolService.getSelectionRecordIds() [if selection mode]
        → AddressLabelService.getAddressesForContacts(ids)
            → MPHelper.getTableRecords() with _TABLE joins
        → Filter (no address, no postal code, opted out)
        → Deduplicate by Household_ID [if household mode]
    → Return { printable: LabelData[], skipped: SkipRecord[] }
    → User configures options + clicks Generate
    → generateLabelPdf server action
        → Build React PDF component tree
        → pdf(<LabelDocument />).toBuffer()
        → Return base64 PDF
    → Client opens PDF blob in new tab
    → User prints via browser print dialog
```

### MP Query

Fetch contacts with household addresses using `_TABLE` foreign key joins on the `Contacts` table:

Note: Multi-level FK joins use underscores between intermediate tables and a dot only before the final field (per `_TABLE` traversal rules in services reference).

```
select: Contact_ID, Display_Name, First_Name, Last_Name,
        Household_ID,
        Household_ID_TABLE.Household_Name,
        Household_ID_TABLE.Bulk_Mail_Opt_Out,
        Household_ID_TABLE_Address_ID_TABLE.Address_Line_1,
        Household_ID_TABLE_Address_ID_TABLE.Address_Line_2,
        Household_ID_TABLE_Address_ID_TABLE.City,
        Household_ID_TABLE_Address_ID_TABLE.[State/Region],
        Household_ID_TABLE_Address_ID_TABLE.Postal_Code,
        Household_ID_TABLE_Address_ID_TABLE.Bar_Code
```

For selection mode, contact IDs come from `ToolService.getSelectionRecordIds(pageId, selectionId)`.

For single-record mode, filter by `Contact_ID = {recordID}`.

### Filtering Logic

Records are excluded from the print run and added to the skip list if:
1. `Address_Line_1` is null/empty → reason: `no_address`
2. `Postal_Code` is null/empty → reason: `no_postal_code`
3. Household's `Bulk_Mail_Opt_Out = true` (from the `Household_ID_TABLE` join, this is a Households table field) → reason: `opted_out`

Records with missing `Bar_Code` are conditionally included based on the user's "Include labels without barcodes" toggle:
- Toggle ON (default): print label without barcode, count in summary as "missing barcode"
- Toggle OFF: exclude from print run → reason: `no_barcode`

### Sort Order

Labels are sorted by `Postal_Code` ascending before rendering to PDF. This aligns with USPS bulk mail presort expectations and groups geographically proximate addresses together.

### Household Deduplication

In Household mode, after filtering:
1. Group records by `Household_ID`
2. Take one representative per household
3. Use `Household_Name` as the label name
4. This prevents duplicate labels for families

## Component Design

### File Structure

```
src/
├── app/(web)/tools/addresslabels/
│   ├── page.tsx                    # Server component, parses tool params
│   └── address-labels.tsx          # "use client" wrapper with ToolContainer
│
├── components/address-labels/
│   ├── address-labels-form.tsx     # Config panel UI
│   ├── address-labels-summary.tsx  # Printable/skipped counts + details
│   ├── label-document.tsx          # @react-pdf/renderer Document
│   ├── address-label.tsx           # Single label (name + address + barcode)
│   ├── imb-barcode.tsx             # IMb barcode SVG for react-pdf
│   ├── actions.ts                  # Server actions
│   └── index.ts                    # Barrel exports
│
├── lib/
│   ├── imb-encoder.ts              # USPS IMb encoding (pure function)
│   └── label-stock.ts              # Label stock dimension configs
│
├── lib/dto/
│   └── address-label.dto.ts        # LabelData, SkipRecord, LabelConfig types
│
└── services/
    └── addressLabelService.ts      # Singleton service for address fetching
```

### Tool Page (`page.tsx`)

Standard async server component:
- Awaits `searchParams`, calls `parseToolParams()`
- Passes `ToolParams` to client component
- Note: `page.tsx` uses `export default` as required by Next.js App Router (the one exception to the named-exports convention, consistent with existing tools like GroupWizard)

### Client Wrapper (`address-labels.tsx`)

"use client" component:
- Wraps content in `ToolContainer` with title "Address Labels"
- Manages state: label data, config options, loading/generating states
- On mount, calls `fetchAddressLabels` server action
- On "Generate & Print", calls `generateLabelPdf` server action
- Opens result PDF in new tab

### Config Form (`address-labels-form.tsx`)

UI controls:
- **Label Stock** dropdown — Avery 5160/5161/5162/5163
- **Address Mode** radio — Household / Individual
- **Start Position** number input — 1 to max labels per sheet
- **Include labels without barcodes** checkbox — default checked

### Summary (`address-labels-summary.tsx`)

Displays after data is fetched:
- "X labels ready to print" (success count)
- "Y skipped" with breakdown by reason (collapsible detail list)
- Shows contact name + skip reason for each skipped record

### Label Document (`label-document.tsx`)

`@react-pdf/renderer` `<Document>` component:
- Receives `LabelData[]`, `LabelStockConfig`, `startPosition`
- Creates `<Page size="LETTER">` elements
- Positions each `<AddressLabel>` using absolute positioning based on stock dimensions
- Handles page breaks when label count exceeds one sheet
- Leaves blank slots for `startPosition` offset

### Address Label (`address-label.tsx`)

Single label `<View>` component:
- Name line (bold, sized to fit)
- Address line 1
- Address line 2 (if present)
- City, State ZIP line
- `<ImbBarcode>` component (if barcode data exists)

### IMb Barcode (`imb-barcode.tsx`)

`@react-pdf/renderer` SVG component:
- Takes encoded bar states from `imbEncode()` 
- Renders 65 `<Rect>` elements
- Bar dimensions per USPS spec: bars ~0.02" wide, ~0.05" spacing
- 4 bar states control y-position and height of each rect

## IMb Encoder (`imb-encoder.ts`)

### Bar_Code Field Format

The `Bar_Code` field in the MP Addresses table (max 50 characters) is populated by the organization's CASS processing software. It contains the barcode data string used to generate the Intelligent Mail Barcode — typically a 20-digit tracking code (without routing) or a 25/29/31-digit string (tracking + routing code derived from ZIP, ZIP+4, or ZIP+4+delivery point).

**Important:** The exact format depends on the CASS software in use. During implementation, verify the actual content of `Bar_Code` in the production MP database. The encoder must handle the format present in the data.

### Encoding Algorithm

Pure TypeScript implementation of USPS-B-3200 Intelligent Mail Barcode encoding:

1. **Input:** The `Bar_Code` string from MP — a 20-digit (no routing) or 25/29/31-digit tracking+routing code
2. **Process:**
   - Convert digits to binary
   - Apply CRC-11 frame check sequence
   - Map to 65 codeword characters
   - Apply bar-state mapping table (USPS-defined)
3. **Output:** Array of 65 bar states (`'T' | 'D' | 'A' | 'F'`)

This is a well-documented USPS specification with deterministic output — no external API calls or dependencies needed.

## Label Stock Definitions (`label-stock.ts`)

```typescript
interface LabelStockConfig {
  id: string;
  name: string;
  pageWidth: number;    // points (72pt = 1in)
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
```

Stock configurations (all dimensions in points):

| Stock | Label W×H | Cols×Rows | Top Margin | Left Margin | Col Gap | Row Gap |
|-------|-----------|-----------|------------|-------------|---------|---------|
| 5160  | 189×72    | 3×10      | 36         | 13.5        | 9       | 0       |
| 5161  | 288×72    | 2×10      | 36         | 12          | 12      | 0       |
| 5162  | 288×96    | 2×7       | 60.75      | 12          | 12      | 0       |
| 5163  | 288×144   | 2×5       | 36         | 12          | 12      | 0       |

## Types (`address-label.dto.ts`)

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
```

## Service (`addressLabelService.ts`)

Singleton service following project conventions:

```typescript
export class AddressLabelService {
  private static instance: AddressLabelService;
  private mp: MPHelper;

  public static async getInstance(): Promise<AddressLabelService> { ... }

  // Fetch addresses for an array of contact IDs
  async getAddressesForContacts(contactIds: number[]): Promise<ContactAddressRow[]>

  // Convenience: fetch for a single contact
  async getAddressForContact(contactId: number): Promise<ContactAddressRow | null>
}
```

Batches contact ID queries if the array is large (MP API may have URL length limits). Uses the `_TABLE` join query described above.

## Server Actions (`actions.ts`)

```typescript
'use server';

// Fetch and filter address data
export async function fetchAddressLabels(
  params: ToolParams,
  config: LabelConfig
): Promise<{ printable: LabelData[]; skipped: SkipRecord[] }>

// Generate PDF from label data
export async function generateLabelPdf(
  labels: LabelData[],
  stockId: string,
  startPosition: number
): Promise<string>  // base64-encoded PDF
```

Both actions validate the session before proceeding.

**PDF transfer strategy:** For typical church mailings (up to a few hundred labels), the base64-encoded PDF will be well under 1MB and fits within Next.js server action payload limits. If a run exceeds limits (thousands of labels), the action should catch the error and return a user-friendly message suggesting a smaller selection. A streaming/temp-file approach can be added later if needed.

**Error handling:** `generateLabelPdf` wraps PDF generation in try/catch and returns a structured error result rather than throwing unhandled.

## New Dependencies

- `@react-pdf/renderer` — React component-based PDF generation (server-side via `pdf().toBuffer()`)
- No barcode library — IMb encoding implemented from USPS spec

## UI Layout

```
┌─────────────────────────────────────────────┐
│ ToolHeader: "Address Labels"                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Configuration ────────────────────────┐ │
│  │ Label Stock:    [Avery 5160 (30/sh) ▼] │ │
│  │ Address Mode:   (•) Household ( ) Indiv│ │
│  │ Start Position: [1 ▼]                  │ │
│  │ ☑ Include labels without barcodes      │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ Summary ──────────────────────────────┐ │
│  │ ✓ 45 labels ready                      │ │
│  │ ⚠ 5 skipped                            │ │
│  │   ├ 3 missing address                  │ │
│  │   └ 2 opted out of bulk mail           │ │
│  │   [View skipped records]               │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  [Generate & Print]                         │
│                                             │
├─────────────────────────────────────────────┤
│ ToolFooter: [Close]                         │
└─────────────────────────────────────────────┘
```

## Verification Plan

1. **Unit tests:**
   - `imb-encoder.test.ts` — test encoding with known USPS test vectors
   - `label-stock.test.ts` — verify label position calculations
   - `addressLabelService.test.ts` — mock MPHelper, test filtering and dedup logic
   - `actions.test.ts` — mock service + auth, test fetch and PDF generation actions

2. **Integration test:**
   - Generate a PDF with sample data for each label stock
   - Verify PDF page count matches expected (labels ÷ labels-per-sheet, rounded up)
   - Verify starting position leaves correct number of blank slots

3. **Manual verification:**
   - Run dev server, navigate to `/tools/addresslabels?pageID=292&recordID=12345`
   - Verify single-contact label generation
   - Test with selection params, verify household dedup
   - Print to PDF and measure label dimensions against physical stock
   - Verify IMb barcode renders correctly by comparing with USPS barcode validator

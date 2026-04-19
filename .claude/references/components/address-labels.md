---
title: Address Labels feature
domain: components
type: reference
applies_to:
  - src/components/address-labels/
  - src/app/(web)/tools/addresslabels/
symbols:
  - AddressLabelsForm
  - AddressLabelsSummary
  - LabelDocument
  - AddressLabel
  - ImbBarcode
  - PostnetBarcode
  - MailMergeTab
  - fetchAddressLabels
  - generateLabelPdf
  - generateLabelDocx
  - mergeTemplate
  - generateSampleTemplate
  - buildWordDocument
related:
  - ../utils/barcodes.md
  - ../utils/label-stock.md
  - ../services/address-label-service.md
  - tool-framework.md
last_verified: 2026-04-17
---

## Purpose
Print USPS-compliant mailing labels (PDF + Word) from MP Contacts/Selection data, with IMb/POSTNET barcodes, and merge addresses into a user-uploaded `.docx` template (one page per address with embedded barcode image) for window-envelope mailings.

## Files (13)

| File | Role |
|------|------|
| `src/components/address-labels/index.ts` | Barrel export for 7 named components |
| `src/components/address-labels/address-labels-form.tsx` | Client config form: stock, start position, address mode, barcode format, Mailer ID, service type |
| `src/components/address-labels/address-labels-summary.tsx` | Client results panel: printable count + grouped skip reasons (collapsible) |
| `src/components/address-labels/label-document.tsx` | `@react-pdf/renderer` `<Document>` with absolute-positioned labels per sheet |
| `src/components/address-labels/address-label.tsx` | Single-label PDF view: name, 1–2 address lines, city/state/zip, barcode |
| `src/components/address-labels/imb-barcode.tsx` | PDF renderer for pre-encoded IMb 65-bar T/D/A/F string |
| `src/components/address-labels/postnet-barcode.tsx` | PDF renderer for JSON-encoded POSTNET `tall`/`short` bars |
| `src/components/address-labels/mail-merge-tab.tsx` | Client mail-merge UI: sample download, template upload, merge + download |
| `src/components/address-labels/sample-template.ts` | `'use server'` — `generateSampleTemplate()` produces the sample `.docx` with merge tokens |
| `src/components/address-labels/word-document.ts` | `buildWordDocument()` — Avery-style `.docx` via `docx` package with BMP barcodes |
| `src/components/address-labels/actions.ts` | Server actions (see API below) |
| `src/components/address-labels/actions.test.ts` | Vitest suite covering all four server actions |
| `src/components/address-labels/word-document.test.ts` | Vitest suite for `buildWordDocument` geometry paths |

Tool route: `src/app/(web)/tools/addresslabels/page.tsx` → `address-labels.tsx` (orchestrates form, fetch, summary, tabs, PDF/Word download).

## Key concepts

- **Label stock**: Avery sheet geometry (`5160`, `5161`, `5162`, `5163` in `src/lib/label-stock.ts`) — page dimensions in PDF points, columns × rows = labels per sheet.
- **Start position**: 1-based slot index on the first sheet; positions below it are rendered as empty slots so re-feeding partially-used sheets lines up.
- **Address mode**: `household` (dedup by `Household_ID`, use `Household_Name`) or `individual` (use `Display_Name`).
- **IMb**: USPS Intelligent Mail Barcode — 65 four-state bars (`T`/`D`/`A`/`F`), requires a 6- or 9-digit **USPS Mailer ID** + service type (`040` First-Class default).
- **POSTNET**: Legacy 5/9/11-digit tall/short bar barcode (no Mailer ID needed).
- **Skip reasons** (`SkipReason` in `src/lib/dto/address-label.dto.ts:15`): `no_address`, `no_postal_code`, `opted_out` (`Bulk_Mail_Opt_Out=true`), `no_barcode` (only when `includeMissingBarcodes=false`), `no_household` (household mode only — contact lacks `Household_ID` so dedup cannot be guaranteed).
- **Pre-encoded bar states**: `preEncodeBarcodes()` encodes once on the server into `LabelData.barStates` so the PDF/Word renderers are pure layout (see `../utils/barcodes.md`).
- **Mail-merge tab**: uploads a `.docx` with `{Name}`, `{AddressLine1}`, `{AddressLine2}`, `{City}`, `{State}`, `{PostalCode}`, `{%Barcode}` tokens plus `{#addresses}…{/addresses}` loop and `{#isNotLast}<pagebreak>{/isNotLast}` conditional — barcodes become BMP images via `docxtemplater-image-module-free`.
- **LocalStorage persistence**: last-used `LabelConfig` stored under key `address-labels-config` (`src/app/(web)/tools/addresslabels/address-labels.tsx:15`).

## API / Interface

### Components (barrel — `index.ts`)
```ts
export { AddressLabelsForm } from './address-labels-form';
export { AddressLabelsSummary } from './address-labels-summary';
export { LabelDocument } from './label-document';
export { AddressLabel } from './address-label';
export { ImbBarcode } from './imb-barcode';
export { PostnetBarcode } from './postnet-barcode';
export { MailMergeTab } from './mail-merge-tab';
```

### Props (from source)
```ts
// address-labels-form.tsx:12
interface AddressLabelsFormProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
  maxStartPosition: number; // = stock.columns * stock.rows
}

// address-labels-summary.tsx:8
interface AddressLabelsSummaryProps {
  printableCount: number;
  skipped: SkipRecord[];
}

// label-document.tsx:13
interface LabelDocumentProps {
  labels: LabelData[];
  stock: LabelStockConfig;
  startPosition: number;
}

// address-label.tsx:29
interface AddressLabelProps { data: LabelData; width: number; height: number; }

// imb-barcode.tsx:4
interface ImbBarcodeProps { barStates: string; width?: number; height?: number; }

// postnet-barcode.tsx:4
interface PostnetBarcodeProps { barStates: string; width?: number; height?: number; }

// mail-merge-tab.tsx:15
interface MailMergeTabProps { printable: LabelData[]; skipped: SkipRecord[]; config: LabelConfig; }
```

### Server actions (`actions.ts`)
```ts
// Returns { printable, skipped } for selection-mode (params.s + params.pageID) or single-record mode (params.recordID).
export async function fetchAddressLabels(
  params: ToolParams,
  config: LabelConfig,
): Promise<FetchAddressLabelsResult>;

// Renders LabelDocument to a PDF via @react-pdf/renderer; returns base64 or { success: false, error }.
export async function generateLabelPdf(
  labels: LabelData[],
  config: LabelConfig,
): Promise<{ success: true; data: string } | { success: false; error: string }>;

// Builds an Avery-layout .docx via `docx` + BMP barcodes; returns base64 or error.
export async function generateLabelDocx(
  labels: LabelData[],
  config: LabelConfig,
): Promise<{ success: true; data: string } | { success: false; error: string }>;

// Merges user-uploaded .docx template (base64, ≤5MB) with address rows + embedded barcode images.
export async function mergeTemplate(
  templateBase64: string,
  labels: LabelData[],
  config: LabelConfig,
): Promise<{ success: true; data: string } | { success: false; error: string }>;
```

Other exported helpers:
- `generateSampleTemplate()` (`sample-template.ts`) — returns base64 starter `.docx`.
- `buildWordDocument(labels, stock, startPosition)` (`word-document.ts`) — returns a `docx` `Document` with a table per page.

### DTOs referenced
From `src/lib/dto/address-label.dto.ts`:
```ts
type AddressMode = 'household' | 'individual';
type BarcodeFormat = 'imb' | 'postnet' | 'none';
type SkipReason = 'no_address' | 'no_postal_code' | 'opted_out' | 'no_barcode' | 'no_household';
interface LabelConfig { stockId; addressMode; startPosition; includeMissingBarcodes; barcodeFormat; mailerId; serviceType; }
interface LabelData { name; addressLine1; addressLine2?; city; state; postalCode; barCode?; deliveryPointCode?; barStates?; barType?: 'imb' | 'postnet'; }
interface SkipRecord { name: string; contactId: number; reason: SkipReason; }
interface FetchAddressLabelsResult { printable: LabelData[]; skipped: SkipRecord[]; }
const SERVICE_TYPES = [{id:'040',…}, {id:'300',…}, {id:'044',…}, {id:'700',…}, {id:'200',…}];
```

## How it works

### fetchAddressLabels (selection vs single-record)
- `actions.ts:28` `getSession()` asserts `session.user.id` or throws `Unauthorized`.
- Selection mode (`params.s && params.pageID`): resolves MP `User_ID` from `session.user.userGuid` via `UserService.getUserIdByGuid`, then `ToolService.getSelectionRecordIds(s, userId, pageID)` → contact IDs → `AddressLabelService.getAddressesForContacts()`.
- Single-record mode (`params.recordID !== -1`): `AddressLabelService.getAddressForContact(recordID)`.
- `filterAndTransform()` (`actions.ts:42`) iterates rows, applies skip rules in fixed order (opted_out → no_address → no_postal_code → no_barcode), dedups by `Household_ID` in household mode, sorts by `postalCode` ascending.

### generateLabelPdf
- Calls `preEncodeBarcodes(labels, config)` then renders `<LabelDocument>` through `pdf()` from `@react-pdf/renderer` → `toBlob()` → base64. Unknown `stockId` or empty labels return `{ success: false }`.

### LabelDocument layout
- `skipCount = startPosition - 1`; `labelsPerPage = stock.columns * stock.rows`; `pageCount = ceil((skipCount + labels.length) / labelsPerPage)`.
- For each page slot, calls `getLabelPosition(stock, globalSlot)` (`@/lib/label-stock`) → absolute `{ x, y }` and renders `<AddressLabel>` inside a `<View style={{ position: 'absolute' }}>`.

### generateLabelDocx / buildWordDocument
- `docx` package — one `Section` per page, a `Table` with `stock.rows` × `stock.columns` cells, borders disabled, row height locked (`rule: 'exact'`) to stock dimensions.
- Barcodes embedded via `ImageRun({ type: 'bmp' })` using `imbBarcodeToBmp` / `postnetBarcodeToBmp` from `src/lib/barcode-image.ts`.

### mergeTemplate (.docx mail merge)
- Rejects `templateBase64` if `Math.ceil(length * 0.75) > 5 * 1024 * 1024`.
- `preEncodeBarcodes()` then builds `addresses[]` rows with `{ Name, AddressLine1, AddressLine2, City, State, PostalCode, Barcode: 'barcode_N', isNotLast }` plus a `Map<string,Buffer>` of BMP barcodes keyed by `barcode_N`.
- `Docxtemplater` with `docxtemplater-image-module-free` — `getImage` resolves key strings to buffers; `getSize` returns `[200, 25]` for the `Barcode` tag.
- Render errors containing "tag" are wrapped as `Template error: …`.

### Mail merge tab upload flow
- Only `.docx`, `file.size <= 5MB`; base64-encoded client-side via `FileReader`.
- Re-validates 6/9-digit Mailer ID before calling `mergeTemplate`.
- Downloads result blob as `merged-letters.docx`.

## Usage

Dashboard card entry (from `src/app/(web)/page.tsx:41`):
```tsx
<Card className="flex flex-col">
  <CardHeader>
    <CardTitle>Address Labels</CardTitle>
    <CardDescription>
      Print address labels with USPS Intelligent Mail Barcodes
    </CardDescription>
  </CardHeader>
  <CardContent className="mt-auto">
    <Link href="/tools/addresslabels">
      <Button className="w-full">Open Tool</Button>
    </Link>
  </CardContent>
</Card>
```

Tool page wiring (from `src/app/(web)/tools/addresslabels/address-labels.tsx:180`):
```tsx
<ToolContainer params={params} title="Address Labels" onClose={handleClose} hideFooter>
  <div className="px-6 py-4 space-y-6 max-w-2xl">
    <AddressLabelsForm
      config={config}
      onChange={handleConfigChange}
      maxStartPosition={maxStartPosition}
    />
    {/* ... tab switcher ... */}
    {activeTab === 'labels' ? (
      <>
        <AddressLabelsSummary printableCount={printable.length} skipped={skipped} />
        <Button onClick={handleGenerate} disabled={printable.length === 0 || isGenerating}>Generate PDF</Button>
        <Button variant="secondary" onClick={handleDownloadWord}>Download Word</Button>
      </>
    ) : (
      <MailMergeTab printable={printable} skipped={skipped} config={config} />
    )}
  </div>
</ToolContainer>
```

## Gotchas

- **Mailer ID is user-supplied** (not an env var). `LabelConfig.mailerId` persists in `localStorage`; both the PDF (`address-labels.tsx:98`) and `mergeTemplate` (`mail-merge-tab.tsx:111`) reject IMb generation unless the length is exactly 6 or 9. `preEncodeBarcodes` silently falls back from IMb → POSTNET when `mailerId` is empty (`src/lib/barcode-helpers.ts:41`).
- **Label geometry is in PDF points** (72pt = 1in). `buildWordDocument` converts via `convertInchesToTwip(ptToIn(...))`. Adding a new `LABEL_STOCKS` entry in the wrong unit silently produces misaligned pages.
- **React-pdf type cast**: `pdf(doc as any)` in `actions.ts:156` is a runtime-safe cast because `LabelDocument` returns `<Document>` at its root; `@react-pdf/renderer` types don't permit a wrapper with its own props.
- **PizZip/docxtemplater expect strings, not Buffers**, as image tag values — `mergeTemplate` keys the buffer map with `barcode_${i}` strings; passing the buffer directly makes the image module misinterpret it as a cached result (`actions.ts:227`).
- **Selection mode requires MP `User_ID`** (not Better Auth `user.id`). `getMPUserId()` does a GUID→ID lookup per call — no memoization.

## Related docs

- `../utils/barcodes.md` — `imbEncode`, `postnetEncode`, `preEncodeBarcodes`, BMP renderers, service types
- `../utils/label-stock.md` — Avery stock table, `getLabelPosition()` geometry
- `../services/address-label-service.md` — `AddressLabelService.getAddressesForContacts` multi-level FK query
- `tool-framework.md` — `ToolContainer` / `hideFooter` / `ToolParams` contract
- `../routing/app-router.md` — tool route conventions under `src/app/(web)/tools/*`
- `../data-flow/README.md` — server-action → service → MPHelper pipeline

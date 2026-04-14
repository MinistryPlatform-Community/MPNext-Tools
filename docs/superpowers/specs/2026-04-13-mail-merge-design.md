# Mail Merge Template Feature — Design Spec

## Context

Churches need to send personalized letters with USPS barcodes for bulk mail discounts. Window envelopes show the address through the envelope window, so the barcode and address must be on the letter itself — not on a separate label. Currently, staff must export data and use external mail merge tools, breaking the single-platform workflow.

This feature adds a "Mail Merge" tab to the existing Address Labels tool, enabling users to download a sample Word template with merge tokens, customize it with their letterhead and formatting, upload it back, and generate a merged document with one personalized page per address — including embedded barcode images.

## Requirements

### Functional
1. **New tab:** "Mail Merge" tab alongside existing "Labels" tab in the Address Labels tool
2. **Download sample template:** A .docx file with pre-placed merge tokens in a window-envelope-friendly layout
3. **Upload template:** File picker for user's customized .docx template containing merge tokens
4. **Merge tokens:** `{Name}`, `{AddressLine1}`, `{#AddressLine2}...{/AddressLine2}`, `{City}`, `{State}`, `{PostalCode}`, `{%Barcode}` (image tag)
5. **Barcode image insertion:** `{%Barcode}` token (docxtemplater image syntax with `%` prefix) replaced with an inline BMP image (IMb or POSTNET) at merge time
6. **Upload size limit:** Maximum 5MB template file. Client-side validation before upload.
7. **Shared barcode config:** Uses the same IMb/POSTNET/None settings and Mailer ID from the Labels tab (persisted in localStorage)
8. **Output:** Single .docx file with page breaks between each address. Downloads to user's machine.
9. **Summary:** Shows count of addresses to merge and skipped records (same filtering as Labels tab)
10. **Upload each time:** No server-side template storage. User uploads fresh each merge run.

### Non-Functional
- Reuses existing address data fetching, filtering, dedup, and barcode encoding from the Labels feature
- Follows existing tool framework patterns
- New tab shares state with Labels tab (config, address data, barcode settings)

## Architecture

### UI Structure

```
Address Labels Tool
├── Tab: Labels (existing)
│   ├── Label config (stock, start position)
│   ├── Address mode, barcode config
│   ├── Summary
│   └── Generate PDF / Download Word buttons
└── Tab: Mail Merge (new)
    ├── Download Sample Template button
    ├── Upload Template file picker
    ├── Barcode config (shared with Labels tab)
    ├── Summary (shared with Labels tab)
    └── Merge & Download button
```

### Data Flow

```
User uploads .docx template
  → Client reads file as ArrayBuffer → base64
  → User clicks "Merge & Download"
  → Client sends: template (base64) + printable LabelData[] + LabelConfig
  → Server action: mergeTemplate()
    → Decode template from base64
    → Pre-encode barcodes (reuse existing buildRoutingCode + imbEncode/postnetEncode)
    → Use docxtemplater to:
      → For each address record:
        → Create merge data object with token values
        → Generate barcode BMP buffer for {Barcode} token
      → Render template with loop (one page per address, page break between)
    → Pack result to buffer
    → Return as base64
  → Client converts to blob → triggers .docx download
```

### Template Engine

**Library:** `docxtemplater` + `docxtemplater-image-module-free`

`docxtemplater` handles:
- Parsing .docx ZIP structure
- Finding `{tag}` tokens in text (handles Word's XML run-splitting)
- Replacing tokens with data values
- Looping over data arrays (one template copy per address)

The image module handles:
- Replacing `{Barcode}` with inline BMP image data
- Sizing the image correctly within the document

### Sample Template Content

The downloadable sample .docx contains the template body wrapped in a docxtemplater loop. The loop iterates over the address array, producing one page per address with an explicit page break between iterations:

```
{#addresses}
{Name}
{AddressLine1}
{#AddressLine2}{AddressLine2}
{/AddressLine2}{City}, {State}  {PostalCode}

{%Barcode}
{#isNotLast}<<<PAGE BREAK>>>{/isNotLast}
{/addresses}
```

Notes:
- `{#AddressLine2}...{/AddressLine2}` is a conditional section — suppresses the line entirely when AddressLine2 is empty (avoids blank line in address block)
- `{%Barcode}` uses the `%` prefix required by the docxtemplater image module
- Page breaks are inserted via a raw XML paragraph containing `<w:br w:type="page"/>` for all but the last address (controlled by `isNotLast` flag)
- Positioned for standard #10 window envelopes (address block ~2.5" from top, 0.75" from left)
- Generated as a server action using the existing `docx` npm package (avoids bundling `docx` in the client)

### Merge Token Mapping

| Token | LabelData Field | Notes |
|---|---|---|
| `{Name}` | `name` | Household_Name or Display_Name |
| `{AddressLine1}` | `addressLine1` | |
| `{#AddressLine2}...{/AddressLine2}` | `addressLine2` | Conditional section — line suppressed when empty |
| `{City}` | `city` | |
| `{State}` | `state` | |
| `{PostalCode}` | `postalCode` | |
| `{%Barcode}` | barcode BMP image | Image tag (`%` prefix). Generated from barStates via barcode-image.ts |

### Barcode Image Generation

Reuses existing infrastructure:
- `src/lib/imb-encoder.ts` — IMb encoding
- `src/lib/postnet-encoder.ts` — POSTNET encoding
- `src/lib/barcode-image.ts` — BMP image generation from bar states

The `{Barcode}` token is replaced with an inline image (BMP format) at ~2" wide x 0.3" tall for IMb, or ~2" x 0.25" for POSTNET.

## Component Design

### New Files

```
src/components/address-labels/
├── mail-merge-tab.tsx          # Mail Merge tab UI (template upload, merge button)
├── sample-template.ts          # Generates the downloadable sample .docx (server action)
src/lib/
├── barcode-helpers.ts          # Extracted: preEncodeBarcodes(), buildRoutingCode(), buildImbTrackingCode()
```

### Modified Files

```
src/components/address-labels/actions.ts               # Add mergeTemplate() action, refactor to use barcode-helpers
src/app/(web)/tools/addresslabels/address-labels.tsx   # Add tab navigation
src/components/address-labels/index.ts                  # Barrel exports
```

**File organization note:** The `mergeTemplate()` server action is added to the existing `actions.ts` (co-located with `generateLabelPdf` and `generateLabelDocx`), following the project convention of a single `actions.ts` per feature folder.

**Refactoring note:** The barcode pre-encoding logic currently duplicated in `generateLabelPdf` and `generateLabelDocx` will be extracted into `src/lib/barcode-helpers.ts` as a shared `preEncodeBarcodes(labels, config)` function. All three actions (`generateLabelPdf`, `generateLabelDocx`, `mergeTemplate`) will call this helper.

### New Dependencies

- `docxtemplater` — .docx template engine
- `docxtemplater-image-module-free` — image insertion for docxtemplater
- `pizzip` — ZIP handling required by docxtemplater (peer dependency)

### Tab Navigation

The client wrapper (`address-labels.tsx`) adds a tab state and renders either the Labels content or the Mail Merge content. Both tabs share:
- `config` (LabelConfig with barcode settings)
- `printable` / `skipped` (address data)
- `handleConfigChange` (persists to localStorage)

### Mail Merge Tab (`mail-merge-tab.tsx`)

Client component with:
- "Download Sample Template" button — calls server action that generates and returns the sample .docx
- File upload input — reads .docx to ArrayBuffer, stores in state. Max 5MB, validated client-side.
- "Merge & Download" button — sends template + data to server action
- Shows uploaded filename and validation (.docx extension + size limit)
- Error display for invalid/corrupt template uploads (docxtemplater parse errors surfaced to user)

### Sample Template Generator (`sample-template.ts`)

Server action using the existing `docx` package. Creates a .docx template with:
- Standard letter margins (1" all sides)
- Address block positioned for #10 window envelope
- All merge tokens pre-placed with formatting (including `{%Barcode}` image tag)
- `{#addresses}...{/addresses}` loop wrapper with page break logic
- Brief instructions paragraph at top (deletable by user)

### Merge Server Action (in `actions.ts`)

```typescript
export async function mergeTemplate(
  templateBase64: string,
  labels: LabelData[],
  config: LabelConfig
): Promise<{ success: true; data: string } | { success: false; error: string }>
```

1. Validates session
2. Decodes template from base64, loads into PizZip
3. Pre-encodes barcodes via shared `preEncodeBarcodes(labels, config)` helper
4. Initializes docxtemplater with image module (configured for BMP, sized per barcode type)
5. Builds data array: each entry has text fields + `Barcode` as BMP buffer + `AddressLine2` for conditional + `isNotLast` flag for page breaks
6. Renders template — docxtemplater loop produces one page per address
7. Returns merged .docx as base64
8. Wraps in try/catch — surfaces docxtemplater parse errors (invalid template) as user-friendly messages

**Compatibility note:** `docxtemplater-image-module-free` must be verified against the installed `docxtemplater` version. If incompatible, fallback: use docxtemplater's raw XML insertion (`{@rawXml}`) to insert image XML directly.

## Verification Plan

1. **Unit tests:**
   - `sample-template.test.ts` — verify template generates valid .docx with correct tokens
   - `merge-actions.test.ts` — mock docxtemplater, test merge flow with sample data

2. **Manual testing:**
   - Download sample template, open in Word, verify tokens visible
   - Customize template (add letterhead, change fonts), upload and merge
   - Verify merged output has one page per address with correct data
   - Verify barcode images render in the merged document
   - Print test to verify window envelope alignment

# Mail Merge Template Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Mail Merge" tab to the Address Labels tool that lets users download a sample Word template, customize it, upload it back, and generate a merged .docx with one personalized page per address including embedded barcode images.

**Architecture:** New tab in existing Address Labels tool. User uploads a .docx template with `{tag}` tokens. Server action uses `docxtemplater` + image module to loop over address data, replacing tokens with values and `{%Barcode}` with BMP images. Output is a single .docx with page breaks between addresses. Barcode encoding is extracted to a shared helper used by all three output actions (PDF, Word labels, merge).

**Tech Stack:** docxtemplater, docxtemplater-image-module-free, pizzip, existing docx package, existing barcode infrastructure

**Spec:** `docs/superpowers/specs/2026-04-13-mail-merge-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/barcode-helpers.ts` | Extracted shared functions: `preEncodeBarcodes()`, `buildRoutingCode()`, `buildImbTrackingCode()` |
| `src/components/address-labels/sample-template.ts` | Server action to generate downloadable sample .docx with merge tokens |
| `src/components/address-labels/mail-merge-tab.tsx` | Mail Merge tab UI: template download, upload, merge button |
| `src/components/address-labels/actions.ts` | Add `mergeTemplate()` action, refactor existing actions to use barcode-helpers |
| `src/app/(web)/tools/addresslabels/address-labels.tsx` | Add tab navigation between Labels and Mail Merge |
| `src/components/address-labels/index.ts` | Updated barrel exports |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install docxtemplater and dependencies**

```bash
npm install docxtemplater pizzip docxtemplater-image-module-free
```

Verify installation succeeds. Check for peer dependency warnings.

- [ ] **Step 2: Verify imports work**

```bash
npx tsx -e "const Docxtemplater = require('docxtemplater'); const PizZip = require('pizzip'); const ImageModule = require('docxtemplater-image-module-free'); console.log('OK:', typeof Docxtemplater, typeof PizZip, typeof ImageModule);"
```

Expected: `OK: function function function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install docxtemplater + pizzip + image module for mail merge"
```

---

## Task 2: Extract barcode helpers

Extract the duplicated barcode encoding logic from `actions.ts` into a shared module. This is a refactor — existing tests must still pass.

**Files:**
- Create: `src/lib/barcode-helpers.ts`
- Create: `src/lib/barcode-helpers.test.ts`
- Modify: `src/components/address-labels/actions.ts`

- [ ] **Step 1: Write tests for the extracted helpers**

Create `src/lib/barcode-helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildRoutingCode, buildImbTrackingCode, preEncodeBarcodes } from './barcode-helpers';
import type { LabelData, LabelConfig } from '@/lib/dto';

describe('barcode-helpers', () => {
  describe('buildRoutingCode', () => {
    it('should build 11-digit routing from ZIP+4 and delivery point', () => {
      expect(buildRoutingCode('32904-7322', '20')).toBe('32904732220');
    });

    it('should build 9-digit routing from ZIP+4 without delivery point', () => {
      expect(buildRoutingCode('32904-7322', undefined)).toBe('329047322');
    });

    it('should build 5-digit routing from ZIP only', () => {
      expect(buildRoutingCode('32904', undefined)).toBe('32904');
    });

    it('should strip dashes', () => {
      expect(buildRoutingCode('32904-7322', '20')).toBe('32904732220');
    });

    it('should pad single-digit delivery point', () => {
      expect(buildRoutingCode('32904', '6')).toBe('3290406');
    });

    it('should return empty string for no postal code', () => {
      expect(buildRoutingCode(undefined, '20')).toBe('');
    });
  });

  describe('buildImbTrackingCode', () => {
    it('should build 20-digit tracking code with 9-digit mailer ID', () => {
      const code = buildImbTrackingCode('901047256', '040', 1);
      expect(code).toBe('00040901047256000001');
      expect(code).toHaveLength(20);
    });

    it('should build 20-digit tracking code with 6-digit mailer ID', () => {
      const code = buildImbTrackingCode('123456', '040', 1);
      expect(code).toBe('00040123456000000001');
      expect(code).toHaveLength(20);
    });
  });

  describe('preEncodeBarcodes', () => {
    const baseLabel: LabelData = {
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    };

    it('should return labels unchanged when format is none', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'none', mailerId: '', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barStates).toBeUndefined();
    });

    it('should encode POSTNET from postal code', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'postnet', mailerId: '', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barType).toBe('postnet');
      expect(result[0].barStates).toBeDefined();
    });

    it('should encode IMb when mailer ID is provided', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'imb', mailerId: '901047256', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barType).toBe('imb');
      expect(result[0].barStates).toHaveLength(65);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/barcode-helpers.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create barcode-helpers.ts**

Create `src/lib/barcode-helpers.ts` by extracting from `src/components/address-labels/actions.ts`:

```typescript
import { imbEncode } from '@/lib/imb-encoder';
import { postnetEncode } from '@/lib/postnet-encoder';
import type { LabelData, LabelConfig } from '@/lib/dto';

/**
 * Build routing code from postal code + delivery point.
 * Returns 5, 9, or 11 digits (or empty string if invalid).
 */
export function buildRoutingCode(postalCode?: string, deliveryPointCode?: string): string {
  const zip = postalCode?.replace(/-/g, '').trim() ?? '';
  if (!zip) return '';
  const dp = deliveryPointCode?.trim().padStart(2, '0') ?? '00';
  if (dp && dp !== '00') return zip + dp;
  return zip;
}

/**
 * Build a full 20-digit IMb tracking code from org settings.
 */
export function buildImbTrackingCode(mailerId: string, serviceType: string, serialNumber: number): string {
  const barcodeId = '00';
  const serialLength = mailerId.length === 6 ? 9 : 6;
  const serial = String(serialNumber).padStart(serialLength, '0');
  return barcodeId + serviceType + mailerId + serial;
}

/**
 * Pre-encode barcodes for all labels based on config.
 * Returns new array with barStates and barType populated.
 */
export function preEncodeBarcodes(labels: LabelData[], config: LabelConfig): LabelData[] {
  let serialCounter = 0;

  return labels.map((label) => {
    if (config.barcodeFormat === 'none') return label;

    const routingCode = buildRoutingCode(label.postalCode, label.deliveryPointCode);

    // Try IMb first
    if (config.barcodeFormat === 'imb' && config.mailerId) {
      try {
        serialCounter++;
        const trackingCode = buildImbTrackingCode(config.mailerId, config.serviceType, serialCounter);
        const imbInput = trackingCode + routingCode;
        const bars = imbEncode(imbInput);
        return { ...label, barStates: bars.join(''), barType: 'imb' as const };
      } catch {
        // Fall through to POSTNET
      }
    }

    // POSTNET fallback
    if (config.barcodeFormat === 'postnet' || config.barcodeFormat === 'imb') {
      if (routingCode) {
        try {
          const bars = postnetEncode(routingCode);
          return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
        } catch {
          try {
            const bars = postnetEncode(routingCode.substring(0, 5));
            return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
          } catch {
            // No barcode possible
          }
        }
      }
    }

    return label;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/barcode-helpers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Refactor actions.ts to use barcode-helpers**

In `src/components/address-labels/actions.ts`:
1. Remove `buildRoutingCode`, `buildImbTrackingCode`, and `imbSerialCounter` (lines 134-157)
2. Remove the inline barcode encoding blocks in `generateLabelPdf` and `generateLabelDocx` — replace with `preEncodeBarcodes(labels, config)`
3. Remove imports of `imbEncode` and `postnetEncode` (now in barcode-helpers)
4. Add import: `import { preEncodeBarcodes } from '@/lib/barcode-helpers';`

The `generateLabelPdf` try block becomes:

```typescript
const labelsWithBars = preEncodeBarcodes(labels, config);
const doc = React.createElement(LabelDocument, { labels: labelsWithBars, stock, startPosition: config.startPosition });
```

Same simplification for `generateLabelDocx`.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: All existing tests still pass. The refactor should be invisible to callers.

- [ ] **Step 7: Commit**

```bash
git add src/lib/barcode-helpers.ts src/lib/barcode-helpers.test.ts src/components/address-labels/actions.ts
git commit -m "refactor(address-labels): extract barcode encoding to shared barcode-helpers module"
```

---

## Task 3: Sample template generator

**Files:**
- Create: `src/components/address-labels/sample-template.ts`

- [ ] **Step 1: Create the sample template server action**

Create `src/components/address-labels/sample-template.ts`:

```typescript
'use server';

import { Document, Paragraph, TextRun, Packer, AlignmentType, PageBreak } from 'docx';

/**
 * Generates a sample .docx template with merge tokens pre-placed
 * for window envelope mailing. Returns base64-encoded .docx.
 *
 * The template uses docxtemplater syntax:
 * - {tag} for text replacement
 * - {%tag} for image replacement
 * - {#tag}...{/tag} for conditional/loop sections
 */
export async function generateSampleTemplate(): Promise<string> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            bottom: 1440,
            left: 1080,   // 0.75 inch
            right: 1080,
          },
        },
      },
      children: [
        // Instructions (user can delete)
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: 'INSTRUCTIONS: Customize this template with your letterhead, then upload it to the Mail Merge tool. Delete this paragraph before merging. Tokens in {curly braces} will be replaced with address data.',
              italics: true,
              size: 18,
              font: 'Arial',
              color: '888888',
            }),
          ],
        }),

        // Loop start marker
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#addresses}', size: 2, color: 'FFFFFF' }),
          ],
        }),

        // Spacer to position address for window envelope (~2" from top)
        ...Array.from({ length: 4 }, () =>
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '', size: 20 })] })
        ),

        // Address block
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{Name}', bold: true, size: 22, font: 'Arial' })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{AddressLine1}', size: 22, font: 'Arial' })],
        }),
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#AddressLine2}', size: 2, color: 'FFFFFF' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{AddressLine2}', size: 22, font: 'Arial' })],
        }),
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/AddressLine2}', size: 2, color: 'FFFFFF' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: '{City}, {State}  {PostalCode}', size: 22, font: 'Arial' }),
          ],
        }),

        // Barcode image placeholder
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: '{%Barcode}', size: 22, font: 'Arial' })],
        }),

        // Page break (conditional — not on last page)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#isNotLast}', size: 2, color: 'FFFFFF' }),
          ],
        }),
        new Paragraph({
          children: [new PageBreak()],
        }),
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/isNotLast}', size: 2, color: 'FFFFFF' }),
          ],
        }),

        // Loop end marker
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/addresses}', size: 2, color: 'FFFFFF' }),
          ],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer).toString('base64');
}
```

Note: The loop/conditional tags are rendered in tiny white text (size 2, color FFFFFF) so they're invisible in Word but still parsed by docxtemplater. The user sees only the visible address tokens.

- [ ] **Step 2: Commit**

```bash
git add src/components/address-labels/sample-template.ts
git commit -m "feat(mail-merge): add sample template generator with merge tokens"
```

---

## Task 4: mergeTemplate server action

**Files:**
- Modify: `src/components/address-labels/actions.ts`

- [ ] **Step 1: Add mergeTemplate action**

Add to the bottom of `src/components/address-labels/actions.ts`:

```typescript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';
import { preEncodeBarcodes } from '@/lib/barcode-helpers';
import { imbBarcodeToBmp, postnetBarcodeToBmp } from '@/lib/barcode-image';

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024; // 5MB

export async function mergeTemplate(
  templateBase64: string,
  labels: LabelData[],
  config: LabelConfig
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  await getSession();

  if (labels.length === 0) {
    return { success: false, error: 'No addresses to merge' };
  }

  // Validate template size
  const templateSize = Math.ceil(templateBase64.length * 0.75); // base64 → bytes
  if (templateSize > MAX_TEMPLATE_SIZE) {
    return { success: false, error: 'Template file exceeds 5MB limit' };
  }

  try {
    const labelsWithBars = preEncodeBarcodes(labels, config);

    // Build merge data array
    const addresses = labelsWithBars.map((label, i) => {
      // Generate barcode image buffer
      let barcodeBuffer: Buffer | null = null;
      if (label.barStates && label.barType) {
        barcodeBuffer = label.barType === 'imb'
          ? imbBarcodeToBmp(label.barStates, 300, 40)
          : postnetBarcodeToBmp(label.barStates, 300, 30);
      }

      return {
        Name: label.name,
        AddressLine1: label.addressLine1,
        AddressLine2: label.addressLine2 || '',
        City: label.city,
        State: label.state,
        PostalCode: label.postalCode,
        Barcode: barcodeBuffer || '',
        isNotLast: i < labelsWithBars.length - 1,
      };
    });

    // Parse template
    const templateBuffer = Buffer.from(templateBase64, 'base64');
    const zip = new PizZip(templateBuffer);

    // Configure image module
    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue: Buffer) => tagValue,
      getSize: (_img: Buffer, _tagValue: unknown, tagName: string) => {
        if (tagName === 'Barcode') return [200, 25]; // width x height in points
        return [100, 100];
      },
    });

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render({ addresses });

    const output = doc.getZip().generate({ type: 'nodebuffer' });
    const base64 = Buffer.from(output).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('mergeTemplate error:', error);
    const message = error instanceof Error ? error.message : 'Template merge failed';
    // Surface docxtemplater parse errors in a user-friendly way
    if (message.includes('tag')) {
      return { success: false, error: `Template error: ${message}. Check that merge tokens are correctly formatted.` };
    }
    return { success: false, error: message };
  }
}
```

Note: The `docxtemplater-image-module-free` API may differ from the paid module. During implementation, verify the `getImage`/`getSize` callback signatures against the installed version. If incompatible, use docxtemplater's `{@rawXml}` tag to insert image XML directly as the fallback described in the spec.

- [ ] **Step 2: Add test for mergeTemplate**

Add to `src/components/address-labels/actions.test.ts` — mock docxtemplater and test the action flow:

```typescript
// Add hoisted mocks at top:
const mockDocxtemplaterRender = vi.hoisted(() => vi.fn());
const mockDocxtemplaterGetZip = vi.hoisted(() => vi.fn());

vi.mock('docxtemplater', () => ({
  default: vi.fn().mockImplementation(() => ({
    render: mockDocxtemplaterRender,
    getZip: mockDocxtemplaterGetZip.mockReturnValue({
      generate: vi.fn().mockReturnValue(Buffer.from('merged-doc')),
    }),
  })),
}));

vi.mock('pizzip', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('docxtemplater-image-module-free', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

// Add test:
describe('mergeTemplate', () => {
  it('should merge template with address data', async () => {
    const labels: LabelData[] = [{
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    }];
    const templateBase64 = Buffer.from('fake-template').toString('base64');

    const result = await mergeTemplate(templateBase64, labels, pdfConfig);

    expect(result.success).toBe(true);
    expect(mockDocxtemplaterRender).toHaveBeenCalledWith(
      expect.objectContaining({
        addresses: expect.arrayContaining([
          expect.objectContaining({ Name: 'Test', City: 'Test' }),
        ]),
      })
    );
  });

  it('should return error for empty labels', async () => {
    const result = await mergeTemplate('dGVzdA==', [], pdfConfig);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('No addresses');
  });

  it('should return error for oversized template', async () => {
    const hugeBase64 = Buffer.alloc(6 * 1024 * 1024).toString('base64');
    const labels: LabelData[] = [{ name: 'T', addressLine1: 'A', city: 'C', state: 'S', postalCode: '12345' }];
    const result = await mergeTemplate(hugeBase64, labels, pdfConfig);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('5MB');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/components/address-labels/actions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/address-labels/actions.ts src/components/address-labels/actions.test.ts
git commit -m "feat(mail-merge): add mergeTemplate server action with docxtemplater"
```

---

## Task 5: Mail Merge tab UI

**Files:**
- Create: `src/components/address-labels/mail-merge-tab.tsx`
- Modify: `src/app/(web)/tools/addresslabels/address-labels.tsx`
- Modify: `src/components/address-labels/index.ts`

- [ ] **Step 1: Create the Mail Merge tab component**

Create `src/components/address-labels/mail-merge-tab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Upload, FileText } from 'lucide-react';
import { AddressLabelsSummary } from './address-labels-summary';
import { generateSampleTemplate } from './sample-template';
import { mergeTemplate } from './actions';
import type { LabelData, SkipRecord, LabelConfig } from '@/lib/dto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface MailMergeTabProps {
  printable: LabelData[];
  skipped: SkipRecord[];
  config: LabelConfig;
}

export function MailMergeTab({ printable, skipped, config }: MailMergeTabProps) {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadSample = async () => {
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const base64 = await generateSampleTemplate();
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mail-merge-template.docx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setTemplateFile(null);
      setTemplateBase64(null);
      return;
    }

    if (!file.name.endsWith('.docx')) {
      setError('Please select a .docx file');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Template file must be under 5MB');
      return;
    }

    setTemplateFile(file);
    const buffer = await file.arrayBuffer();
    setTemplateBase64(Buffer.from(buffer).toString('base64'));
  };

  const handleMerge = async () => {
    if (!templateBase64 || printable.length === 0) return;

    if (config.barcodeFormat === 'imb') {
      if (!config.mailerId || (config.mailerId.length !== 6 && config.mailerId.length !== 9)) {
        setError('IMb requires a 6 or 9 digit USPS Mailer ID');
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await mergeTemplate(templateBase64, printable, config);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged-letters.docx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-md border p-4">
        <Label className="text-base font-medium">Template</Label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download Sample Template
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-upload">Upload your template (.docx, max 5MB)</Label>
          <Input
            id="template-upload"
            type="file"
            accept=".docx"
            onChange={handleFileChange}
          />
          {templateFile && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> {templateFile.name} ({(templateFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
      </div>

      <AddressLabelsSummary printableCount={printable.length} skipped={skipped} />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleMerge}
          disabled={!templateBase64 || printable.length === 0 || isGenerating}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Merge & Download
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add tab navigation to the client wrapper**

Modify `src/app/(web)/tools/addresslabels/address-labels.tsx`:

1. Add import for the tab UI component (shadcn Tabs or simple state-based tabs)
2. Add `activeTab` state (`'labels' | 'merge'`)
3. Wrap the Labels content and Mail Merge content in tab panels
4. The barcode config section renders above the tabs (shared), the tab-specific content renders below

The key changes to `address-labels.tsx`:
- Add state: `const [activeTab, setActiveTab] = useState<'labels' | 'merge'>('labels');`
- Import `MailMergeTab` from components
- Split the form into shared config (address mode, barcode type, mailer ID) rendered above tabs, and tab-specific content (label stock, start position for Labels tab; template upload for Mail Merge tab)
- Render `<MailMergeTab printable={printable} skipped={skipped} config={config} />` when merge tab is active

- [ ] **Step 3: Update barrel exports**

Add to `src/components/address-labels/index.ts`:

```typescript
export { MailMergeTab } from './mail-merge-tab';
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/address-labels/mail-merge-tab.tsx src/components/address-labels/index.ts "src/app/(web)/tools/addresslabels/address-labels.tsx"
git commit -m "feat(mail-merge): add Mail Merge tab with template upload and merge flow"
```

---

## Task 6: Manual testing and fixes

- [ ] **Step 1: Start dev server and test the full flow**

```bash
npm run dev
```

1. Navigate to the address labels tool with a selection
2. Click "Mail Merge" tab
3. Click "Download Sample Template" — verify .docx downloads
4. Open template in Word — verify tokens are visible and positioned correctly
5. Upload the template (unmodified first)
6. Click "Merge & Download" — verify merged .docx downloads
7. Open in Word — verify:
   - One page per address
   - Name, address, city/state/zip replaced with real data
   - Barcode image renders below address
   - Page breaks between addresses
   - Empty AddressLine2 doesn't leave blank line
8. Test with customized template (add letterhead, change fonts)

- [ ] **Step 2: Fix any issues found**

Common issues to watch for:
- `docxtemplater-image-module-free` API differences — may need to adjust `getImage`/`getSize` callbacks
- Page break raw XML insertion — may need `{@rawXml}` instead of conditional text
- White text tags may render in some Word versions — adjust size/color
- BMP image sizing in Word may need adjustment

- [ ] **Step 3: Run tests and lint**

```bash
npx vitest run
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/address-labels/ "src/app/(web)/tools/addresslabels/"
git commit -m "fix(mail-merge): address issues found during manual testing"
```

---

## Task 7: Final verification

- [ ] All tests pass (`npx vitest run`)
- [ ] Lint passes (`npm run lint`)
- [ ] Download Sample Template works and opens in Word
- [ ] Tokens visible and correctly placed in sample template
- [ ] Upload template validates .docx extension and 5MB size limit
- [ ] Merge produces correct output with one page per address
- [ ] Barcode images render in merged document (both IMb and POSTNET)
- [ ] Empty AddressLine2 suppressed (no blank line)
- [ ] Page breaks between addresses (not after last)
- [ ] Customized template preserves user formatting after merge
- [ ] Labels tab still works unchanged
- [ ] Barcode config shared between tabs
- [ ] localStorage persistence still works

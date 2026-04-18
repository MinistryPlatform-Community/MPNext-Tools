---
title: USPS Barcodes (IMb, POSTNET, BMP rendering)
domain: utils
type: reference
applies_to:
  - src/lib/imb-encoder.ts
  - src/lib/postnet-encoder.ts
  - src/lib/barcode-helpers.ts
  - src/lib/barcode-image.ts
symbols:
  - imbEncode
  - BarState
  - postnetEncode
  - PostnetBar
  - buildRoutingCode
  - buildImbTrackingCode
  - preEncodeBarcodes
  - imbBarcodeToBmp
  - postnetBarcodeToBmp
related:
  - ../components/README.md
  - label-stock.md
last_verified: 2026-04-17
---

## Purpose
Hand-rolled USPS Intelligent Mail Barcode (IMb, USPS-B-3200) and POSTNET encoders plus a tiny BMP renderer, used by the address-labels tool to generate mail-merge / PDF / Word output. No third-party barcode libraries.

## Files
- `src/lib/imb-encoder.ts` — 4-state IMb encoder (65 bars: `T`/`D`/`A`/`F`)
- `src/lib/imb-encoder.test.ts` — USPS-B-3200 example 4 vector + length / variant coverage
- `src/lib/postnet-encoder.ts` — tall/short POSTNET encoder with check digit
- `src/lib/postnet-encoder.test.ts`
- `src/lib/barcode-helpers.ts` — high-level builders: routing code, 20-digit IMb tracking code, `preEncodeBarcodes(labels, config)`
- `src/lib/barcode-helpers.test.ts`
- `src/lib/barcode-image.ts` — 24-bit BMP renderer for IMb and POSTNET bar strings
- `src/lib/barcode-image.test.ts`

## Key concepts
- **IMb (Intelligent Mail Barcode)** — 65-bar, 4-state USPS barcode (`T`=tracker, `D`=descender, `A`=ascender, `F`=full). Replaces POSTNET for USPS mail automation. Encodes a 20-digit tracking code + optional 5/9/11-digit routing (ZIP / ZIP+4 / ZIP+4+DP).
- **POSTNET** — Legacy 2-of-5 tall/short barcode; supports 5/9/11-digit ZIPs with a Mod-10 check digit. Kept as a fallback when `mailerId` is absent or IMb encoding throws.
- **Mailer ID** — USPS-assigned 6- or 9-digit identifier embedded in the IMb tracking block. Serial-number length is derived from Mailer ID length (6-digit MID → 9-digit serial; 9-digit MID → 6-digit serial).
- **Service Type** — 3-digit USPS service-type code (e.g., `040` for First-Class with IMb tracking).
- **Routing code** — digits-only concatenation of ZIP (+ optional +4 + optional 2-digit Delivery Point).
- **Bar-state string** — IMb bars are stored as a 65-char `T/D/A/F` string; POSTNET bars are stored as a JSON-stringified `('tall'|'short')[]`.

## API / Interface

### IMb encoder — `src/lib/imb-encoder.ts`
```typescript
export type BarState = 'T' | 'D' | 'A' | 'F';

export function imbEncode(input: string): BarState[];
// input: 20 | 25 | 29 | 31 digits (tracking + optional routing)
// throws on non-numeric or invalid-length input
// returns: 65-element BarState array
```

### POSTNET encoder — `src/lib/postnet-encoder.ts`
```typescript
export type PostnetBar = 'tall' | 'short';

export function postnetEncode(input: string): PostnetBar[];
// input: 5 | 9 | 11 digits (dashes stripped)
// throws on non-numeric or invalid-length input
// returns: frame + digit bars (incl. check digit) + frame
//   5-digit → 32 bars; 9-digit → 52 bars; 11-digit → 62 bars
```

### Helpers — `src/lib/barcode-helpers.ts`
```typescript
export function buildRoutingCode(postalCode?: string, deliveryPointCode?: string): string;
// - Returns '' when postalCode missing
// - Strips dashes from postalCode
// - Pads deliveryPointCode to 2 digits; only appends when dp !== '00'
// - Output length: 0 | 5 | 9 | 11 (+5-digit DP variants)

export function buildImbTrackingCode(
  mailerId: string,
  serviceType: string,
  serialNumber: number,
): string;
// Layout: [barcodeId='00'(2)] + [serviceType(3)] + [mailerId(6|9)] + [serial(9|6)]
// Always 20 digits total.

export function preEncodeBarcodes(
  labels: LabelData[],
  config: LabelConfig,
): LabelData[];
// - barcodeFormat === 'none' → labels returned unchanged
// - barcodeFormat === 'imb' && config.mailerId → try IMb
//     on success: barStates = bars.join(''), barType = 'imb'
//     on throw OR no mailerId: fall through to POSTNET
// - barcodeFormat === 'postnet' | 'imb' fallback:
//     tries full routingCode, then retries with first 5 digits
//     on success: barStates = JSON.stringify(bars), barType = 'postnet'
// - Serial counter increments per label (per call to preEncodeBarcodes).
```

### BMP image renderer — `src/lib/barcode-image.ts`
```typescript
export function imbBarcodeToBmp(
  barStates: string,           // 'TDAFTDAF...' (65 chars typical)
  width = 200,
  height = 30,
): Buffer;                     // Node Buffer, 24-bit BMP, signature 'BM'

export function postnetBarcodeToBmp(
  barStatesJson: string,       // JSON.stringify(PostnetBar[])
  width = 200,
  height = 24,
): Buffer;
// - Invalid JSON → returns 1x1 white BMP (does not throw)
// - Unknown bar chars in IMb input are skipped silently
```

## How it works

### IMb encoding pipeline (`imbEncode`)
1. Validate length ∈ {20, 25, 29, 31} and digits-only.
2. Split: `tracking = input[0..20)`, `routing = input[20..)`.
3. `convertRoutingCode(routing)` → BigInt (empty→0; 5-digit→zip+1; 9-digit→zip+100001; 11-digit→zip+1000100001).
4. `convertTrackingCode()` folds 20 tracking digits into the routing value with mixed radix (first digit ×10, second ×5, remaining ×10).
5. Serialize BigInt to 13 big-endian bytes.
6. `crc11()` over 13 bytes, skipping the top 2 bits of byte 0; polynomial `0x0F35`, init `0x07FF`.
7. `binaryToCodewords()` produces 10 codewords via mixed-radix division (last mod 636; first 9 mod 1365). Reversed to `[A..J]`.
8. `codewords[9] *= 2`; if FCS bit 10 set, `codewords[0] += 659`.
9. Each codeword → 13-bit character via `TABLE_5_OF_13` (cw≤1286) or `TABLE_2_OF_13` (1287–1364). These lookup tables are precomputed from all 13-bit values with exactly 5-of-13 or 2-of-13 bits set, pairing non-palindromic low ↔ palindromic high.
10. For each of the 10 low bits of FCS, XOR corresponding character with `0x1FFF` (bit-flip).
11. `BAR_TABLE` (65 entries) maps each bar index to `(descChar, descBit, ascChar, ascBit)`:
    - both set → `F`, desc only → `D`, asc only → `A`, neither → `T`.

### POSTNET encoding (`postnetEncode`)
- Strip dashes, validate length ∈ {5, 9, 11} and digits-only.
- Check digit = `(10 - (sum_of_digits % 10)) % 10`.
- Emit: `['tall', ...digitBars_for_each(digit+check), 'tall']`.
- Each digit maps to 5 bars via `DIGIT_TABLE` (always 2 tall, 3 short).

### BMP rendering
- Simple uncompressed BMP: 14-byte file header + 40-byte DIB (BITMAPINFOHEADER) + bottom-up 24-bit BGR pixel rows padded to 4-byte boundary.
- IMb: bar width = `max(floor(width/65 * 0.4), 1)`; per-state `topOffset`/`barHeight` as fractions of image height:
  - `T`: top 0.35, height 0.3
  - `D`: top 0.15, height 0.85
  - `A`: top 0.00, height 0.65
  - `F`: top 0.00, height 1.00
- POSTNET: tall = full height; short = 0.4 × height; bars bottom-aligned.

### Routing & tracking helpers
- `buildRoutingCode('32904-7322', '20')` → `'32904732220'` (11 digits)
- `buildRoutingCode('32904', undefined)` → `'32904'`
- `buildImbTrackingCode('901047256', '040', 1)` → `'00040901047256000001'`
- `buildImbTrackingCode('123456', '040', 1)` → `'00040123456000000001'`

## Usage

### Generating barcodes for an address-label print run
From `src/components/address-labels/actions.ts:22-26`:

```typescript
import { preEncodeBarcodes } from '@/lib/barcode-helpers';
import { getLabelStock } from '@/lib/label-stock';
import { imbBarcodeToBmp, postnetBarcodeToBmp } from '@/lib/barcode-image';
```

`preEncodeBarcodes(labels, config)` runs before PDF/Word export so each row carries a `barStates`/`barType` pair consumed by the renderers.

### Word-document embedding
From `src/components/address-labels/word-document.ts:18`:

```typescript
import { imbBarcodeToBmp, postnetBarcodeToBmp } from '@/lib/barcode-image';
```

Word accepts BMP natively, so the renderer returns raw `Buffer`s that can be inline-embedded without converting to PNG.

### PDF-preview rendering
- `src/components/address-labels/imb-barcode.tsx` — `@react-pdf/renderer` `<View>` component for PDF output; imports `type BarState` from `@/lib/imb-encoder`.
- `src/components/address-labels/postnet-barcode.tsx` — `@react-pdf/renderer` `<View>` component for PDF output; imports `type PostnetBar` from `@/lib/postnet-encoder`.

### IMb test vector (USPS-B-3200 example 4)
From `src/lib/imb-encoder.test.ts:11-13`:

```typescript
expect(imbEncode('0123456709498765432101234567891').join('')).toBe(
  'AADTFFDFTDADTAADAATFDTDDAAADDTDTTDAFADADDDTFFFDDTTTADFAAADFTDAADA'
);
```

## Gotchas
- **Fallback swallows IMb errors silently.** In `preEncodeBarcodes` (`src/lib/barcode-helpers.ts:48`), an IMb throw falls through to POSTNET with no logging. If a mailer config is subtly wrong (bad service type, bad mailer ID length), labels silently downgrade to POSTNET. See glossary candidate "IMb→POSTNET fallback".
- **POSTNET `barStates` is JSON, IMb `barStates` is a raw string.** Consumers must branch on `barType` before rendering. Enforced at `src/lib/barcode-helpers.ts:47` (IMb) vs `:57,61` (POSTNET) and `src/lib/barcode-image.ts:64` (IMb expects plain string) vs `:98-103` (POSTNET parses JSON and silently falls back to a 1×1 BMP on parse failure).
- **`buildRoutingCode` treats DP `'00'` as absent.** Pass a real 1–2 digit delivery point; `'00'` returns a 5/9-digit routing, not 7/11-digit. See `src/lib/barcode-helpers.ts:13`.
- **BMP invalid-input behavior differs.** `imbBarcodeToBmp` silently skips unknown bar chars; `postnetBarcodeToBmp` returns a 1×1 fallback on JSON parse failure — neither throws.

## Related docs
- `label-stock.md` — geometry feeds dimensions for label-embedded barcodes
- `tool-params.md` — address-labels page hydrates params before calling barcode actions
- `../components/README.md` (cross-ref) — `address-labels/*` consumes every symbol here

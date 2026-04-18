---
title: utils
type: index
domain: utils
---

## What's in this domain
Hand-rolled, framework-agnostic utilities under `src/lib/`: USPS barcode encoders (IMb + POSTNET), BMP image rendering for Word export, Avery label-stock geometry, Ministry Platform tool URL-parameter parsing, and the shadcn `cn()` Tailwind class merger.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `barcodes.md` | `imbEncode()`, `postnetEncode()`, `buildRoutingCode()`, `buildImbTrackingCode()`, `preEncodeBarcodes()`, BMP image renderers | Touching address-label barcode generation, Word-document export, or adjusting IMb service type / mailer ID |
| `label-stock.md` | Avery 5160/5161/5162/5163 dimensions, `getLabelPosition()` page/row/column math | Adding a new label stock, tweaking PDF/Word layout |
| `tool-params.md` | `parseToolParams()`, `PageData`, `isNewRecord()`, `isEditMode()`, standard MP tool query params (`pageID`, `s`, `recordID`, `recordDescription`, …) | Building or modifying any tool page (`src/app/(web)/tools/*/page.tsx`) |

## Code surfaces
| Path | Role |
|------|------|
| `src/lib/imb-encoder.ts` | USPS-B-3200 Intelligent Mail Barcode (IMb) 4-state encoder → 65 `BarState` bars |
| `src/lib/postnet-encoder.ts` | POSTNET tall/short bar encoder with check digit |
| `src/lib/barcode-helpers.ts` | Routing-code and tracking-code builders; `preEncodeBarcodes()` batch encoder with IMb→POSTNET fallback |
| `src/lib/barcode-image.ts` | `imbBarcodeToBmp()` + `postnetBarcodeToBmp()` — 24-bit BMP renderers for Word embedding |
| `src/lib/label-stock.ts` | `LABEL_STOCKS` array, `getLabelStock()`, `getLabelPosition()` (points-based geometry) |
| `src/lib/tool-params.ts` | `ToolParams`, `PageData`, `parseToolParams()` (calls `ToolService.getPageData`), `isNewRecord()`, `isEditMode()` |
| `src/lib/utils.ts` | shadcn `cn(...inputs)` — `twMerge(clsx(...))`; 27 consumers total (22 under `src/components/ui/**` + 5 feature components) |

## Related domains
- `../components/README.md` — `address-labels` consumes every barcode utility + `label-stock`; `tool` / `dev-panel` consume `tool-params`
- `../services/README.md` — `ToolService.getPageData(pageID)` is invoked by `parseToolParams()`
- `../routing/README.md` — tool pages pass Next.js `searchParams` into `parseToolParams()`

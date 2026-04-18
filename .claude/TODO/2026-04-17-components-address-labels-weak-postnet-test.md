---
title: POSTNET barcode test in word-document.test.ts uses malformed input
severity: low
tags: [missing-test, drift]
area: components
files:
  - src/components/address-labels/word-document.test.ts
  - src/lib/barcode-image.ts
discovered: 2026-04-17
discovered_by: components-address-labels
status: open
---

## Problem
`src/components/address-labels/word-document.test.ts:57-65` ("handles label with POSTNET barcode states") passes a raw string `'LFLFLFLF...'` as `label.barStates`. `buildWordDocument` forwards that to `postnetBarcodeToBmp`, which expects JSON-encoded `PostnetBar[]` (`'tall'|'short'`). The call hits the `JSON.parse` catch branch in `src/lib/barcode-image.ts:98-104` and returns a 1×1 blank BMP — i.e., the intended code path (rendering POSTNET bars into an ImageRun) is never actually exercised. The test only asserts `expect(doc).toBeInstanceOf(Document)`, so it passes without proving the feature works.

The `'LFLFLF...'` format looks like a typo of an IMb-style state string (IMb uses `T`/`D`/`A`/`F`) and is not a valid format for either encoder.

## Evidence
- `src/components/address-labels/word-document.test.ts:61` — `barStates: 'LFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFLFF'`
- `src/lib/barcode-image.ts:99-104` — `JSON.parse(barStatesJson)` → `catch { return createBmp(1, 1, …) }`
- `src/components/address-labels/postnet-barcode.tsx:14-20` — confirms the expected format is JSON-encoded `PostnetBar[]`

## Proposed fix
Change the test input to a real JSON-encoded POSTNET array and assert that `postnetBarcodeToBmp` produced a non-trivial image. Example:

```ts
barStates: JSON.stringify(Array.from({ length: 32 }, (_, i) => i % 2 ? 'tall' : 'short' as const))
```

Optionally, spy on `postnetBarcodeToBmp` and assert it was called with a non-empty parsed array.

## Impact if not fixed
The POSTNET ImageRun branch in `buildLabelCell` (`src/components/address-labels/word-document.ts:80-99`) is untested in practice — a regression that corrupts the POSTNET Word-export path would slip through CI.

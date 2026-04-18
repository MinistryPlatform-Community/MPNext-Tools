---
title: IMb encoding errors silently fall back to POSTNET in preEncodeBarcodes
severity: medium
tags: [bug, refactor]
area: utils
files: [src/lib/barcode-helpers.ts]
discovered: 2026-04-17
discovered_by: utils
status: open
---

## Problem
`preEncodeBarcodes()` wraps `imbEncode()` in a bare `try { ... } catch { /* Fall through to POSTNET */ }`. Any IMb encoding failure — invalid mailer ID length, bad service type digits, malformed routing code — is swallowed with no log, no counter, and no surfacing to the caller. Labels silently downgrade from IMb to POSTNET (or to no barcode at all if the routing code is also invalid). Operators configuring a new mailer will never see why IMb output is missing.

## Evidence
- `src/lib/barcode-helpers.ts:42-51`:
  ```typescript
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
  ```
- `imbEncode()` throws on non-numeric input, invalid lengths (not 20/25/29/31), and codeword out-of-range — all real, actionable operator errors (`src/lib/imb-encoder.ts:321-365`).
- The nested POSTNET fallback at `:57-64` has the same pattern (two levels of silent `catch`).

## Proposed fix
- At minimum, `console.warn` with the thrown error and the offending label identifier, so server logs capture the downgrade.
- Better: track failed IMb encodes on the returned `LabelData` (e.g., `barcodeError?: string`) and surface a banner when the user previews a print run. The form already owns `config.mailerId`; a clear "IMb failed for N of M labels (downgraded to POSTNET)" would give operators actionable feedback.
- Add unit tests covering the fallback branches (only the happy-path IMb and happy-path POSTNET are tested today — see `src/lib/barcode-helpers.test.ts`).

## Impact if not fixed
Operators configuring a new Mailer ID or Service Type will see POSTNET where they expect IMb, with no indication why. The failure is localized per-label, so a subtle data issue (e.g., one malformed ZIP in a batch) can partially downgrade a run silently. Mailing discounts tied to IMb may be lost.

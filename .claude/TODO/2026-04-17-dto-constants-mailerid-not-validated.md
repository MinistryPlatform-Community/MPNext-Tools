---
title: LabelConfig.mailerId lacks runtime validation
severity: low
tags: [refactor]
area: dto-constants
files: [src/lib/dto/address-label.dto.ts, src/components/address-labels/address-labels-form.tsx, src/lib/barcode-helpers.ts]
discovered: 2026-04-17
discovered_by: dto-constants
status: open
---

## Problem
`LabelConfig.mailerId: string` is typed as plain string. The only validation is a client-side digit-strip + 9-char slice at `src/components/address-labels/address-labels-form.tsx:109`. The server-side consumer `buildImbTrackingCode()` assumes `mailerId.length === 6` or `9` (`src/lib/barcode-helpers.ts:23`) but does NOT verify — a 7-digit or 0-digit value silently produces a malformed IMb.

## Evidence
- `src/lib/dto/address-label.dto.ts:40` — `mailerId: string;`
- `src/components/address-labels/address-labels-form.tsx:108-110` — strips non-digits, slices to 9
- `src/lib/barcode-helpers.ts:23` — `const serialLength = mailerId.length === 6 ? 9 : 6;` (no else-error branch)
- USPS spec: Mailer ID is exactly 6 or 9 digits — no other length is valid

## Proposed fix
Add a `validateMailerId(value: string): string` helper in `src/lib/validation.ts`:

```typescript
const MAILER_ID_REGEX = /^(\d{6}|\d{9})$/;
export function validateMailerId(value: string): string {
  if (!MAILER_ID_REGEX.test(value)) {
    throw new Error(`Mailer ID must be exactly 6 or 9 digits, got: ${value.length}`);
  }
  return value;
}
```

Call from `buildImbTrackingCode` AND from the `'use server'` action before PDF rendering. Also add `validation.test.ts` coverage.

## Impact if not fixed
Low. Barcode readers will reject malformed IMb at the post office rather than causing data loss; but end-users may waste postage on unscannable labels.

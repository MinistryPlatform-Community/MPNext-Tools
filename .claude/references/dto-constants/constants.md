---
title: Shared Constants & Validation Helpers
domain: dto-constants
type: reference
applies_to: [src/lib/dto/address-label.dto.ts, src/lib/label-stock.ts, src/lib/validation.ts, src/components/group-wizard/types.ts, src/services/addressLabelService.ts, src/services/toolService.ts, src/components/template-editor/grapes-config.ts]
symbols: [SERVICE_TYPES, LABEL_STOCKS, LabelStockConfig, LabelPosition, WIZARD_STEPS, WizardStepIndex, DEFAULT_MJML_TEMPLATE, validateGuid, validatePositiveInt, validateColumnName, escapeFilterString, BATCH_SIZE, MAX_TEMPLATE_SIZE, MAX_FILE_SIZE, MAX_MJML_SIZE]
related: [dtos.md, ../services/README.md, ../utils/README.md]
last_verified: 2026-04-17
---

## Purpose
Inventory of module-level runtime constants and SQL-safety validation helpers. Also flags hardcoded IDs / magic numbers that are candidates for extraction.

## Files

- `src/lib/dto/address-label.dto.ts:26-32` — `SERVICE_TYPES`
- `src/lib/label-stock.ts` — `LABEL_STOCKS` (Avery sheet dimensions)
- `src/lib/validation.ts` — 4 SQL-safety helpers + 2 regexes
- `src/lib/validation.test.ts` — 19 test cases
- `src/components/group-wizard/types.ts:51-60` — `WIZARD_STEPS`, `WizardStepIndex`
- `src/components/template-editor/grapes-config.ts:5` — `DEFAULT_MJML_TEMPLATE`
- `src/services/addressLabelService.ts:21` — `BATCH_SIZE = 100` (module-local)
- `src/services/toolService.ts:283` — `BATCH_SIZE = 100` (class static)

## Key concepts

- Constants are **not centralized** — each lives next to its consumer (`src/lib/dto/*`, `src/lib/label-stock.ts`, `src/components/*/types.ts`).
- `validation.ts` is the single SQL-safety entry point; all services route user input through one of its four helpers before interpolating into filter strings.
- Two independent `BATCH_SIZE = 100` literals exist (services shard TODO candidate).

## API / Interface

### Runtime enum-like constants

```typescript
// src/lib/dto/address-label.dto.ts:26-32
export const SERVICE_TYPES = [
  { id: '040', name: 'First-Class Mail' },
  { id: '300', name: 'Marketing Mail (Standard)' },
  { id: '044', name: 'First-Class Mail (Presorted)' },
  { id: '700', name: 'Periodicals' },
  { id: '200', name: 'Priority Mail' },
] as const;
```

USPS service type codes drive `LabelConfig.serviceType`. Default selected in UI is `'040'` (`src/app/(web)/tools/addresslabels/address-labels.tsx:53`).

```typescript
// src/lib/label-stock.ts:23
export const LABEL_STOCKS: LabelStockConfig[] = [
  { id: '5160', name: 'Avery 5160 (30/sheet)', pageWidth: 612, pageHeight: 792,
    labelWidth: 189, labelHeight: 72, columns: 3, rows: 10,
    marginTop: 36, marginLeft: 13.5, columnGap: 9, rowGap: 0 },
  // 5161, 5162, 5163 ...
];
```

Dimensions in PDF points (72pt = 1in). `getLabelStock(id)` lookup + `getLabelPosition(stock, index)` iteration at `src/lib/label-stock.ts:82-98`.

```typescript
// src/components/group-wizard/types.ts:51-60
export const WIZARD_STEPS = [
  { label: 'Identity',     description: 'Name, type & dates' },
  { label: 'Organization', description: 'Ministry, people & structure' },
  { label: 'Meeting',      description: 'Schedule & location' },
  { label: 'Attributes',   description: 'Size, focus & details' },
  { label: 'Settings',     description: 'Visibility & promotion' },
  { label: 'Review',       description: 'Review & submit' },
] as const;

export type WizardStepIndex = 0 | 1 | 2 | 3 | 4 | 5;
```

### Validation helpers — `src/lib/validation.ts`

```typescript
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMN_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validateGuid(value: string): string;
export function validatePositiveInt(value: number): number;
export function validateColumnName(value: string): string;
export function escapeFilterString(value: string): string;
```

`escapeFilterString` handles three characters (MP filter uses SQL LIKE semantics):

```typescript
// src/lib/validation.ts:25-30
export function escapeFilterString(value: string): string {
  return value
    .replace(/'/g, "''")
    .replace(/%/g, '[%]')
    .replace(/_/g, '[_]');
}
```

## Consumer map

| Symbol | Consumers |
|--------|-----------|
| `SERVICE_TYPES` | `src/components/address-labels/address-labels-form.tsx:9,128` |
| `LABEL_STOCKS` | `src/lib/label-stock.ts` (internal), `src/components/address-labels/address-labels-form.tsx`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `getLabelStock` | `src/components/address-labels/actions.ts:21`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `WIZARD_STEPS` | `src/components/group-wizard/*` |
| `validateGuid` | `src/services/userService.ts:72,84` |
| `validatePositiveInt` | `src/services/toolService.ts:334`, `src/services/addressLabelService.ts:76`, `src/services/groupService.ts:176` |
| `validateColumnName` | `src/services/toolService.ts:307,308,310,312` |
| `escapeFilterString` | `src/services/groupService.ts:152,163` |

## How it works

- `as const` tuples give literal-typed ids to `LabelConfig.serviceType`, `WIZARD_STEPS`, etc.
- `LABEL_STOCKS` is a mutable-typed array (`LabelStockConfig[]`) — NOT `as const`. If mutation-safety is desired this is a refactor candidate.
- `validateGuid` / `validatePositiveInt` / `validateColumnName` throw on bad input; callers rely on the throw (no return-based error).
- `escapeFilterString` returns the escaped string; callers inline-interpolate it into the OData `$filter`.

## Magic-number / hardcoded-ID audit

Items found in `src/` outside `src/lib/dto/` and `src/lib/validation.ts`:

| Literal | Location | Meaning | Extraction candidate? |
|---------|----------|---------|-----------------------|
| `BATCH_SIZE = 100` | `src/services/addressLabelService.ts:21` (module) + `src/services/toolService.ts:283` (class static) | MP record fetch batch size | Yes — two independent copies, merge into single export (e.g. `src/lib/constants.ts`) |
| `MAX_TEMPLATE_SIZE = 5 * 1024 * 1024` | `src/components/address-labels/actions.ts:203` | 5MB docx upload cap | Possibly |
| `MAX_FILE_SIZE = 5 * 1024 * 1024` | `src/components/address-labels/mail-merge-tab.tsx:13` | 5MB docx upload cap (client mirror) | Yes — duplicated literal |
| `MAX_MJML_SIZE = 512_000` | `src/components/template-editor/actions.ts:13` | 500KB MJML cap | Feature-local, OK |
| `'040'` default | `src/app/(web)/tools/addresslabels/address-labels.tsx:53` | Default USPS service type | Consider `DEFAULT_SERVICE_TYPE = SERVICE_TYPES[0].id` |
| `serialLength = mailerId.length === 6 ? 9 : 6` | `src/lib/barcode-helpers.ts:23` | USPS IMb rule: 6-digit MID → 9-digit serial, 9-digit MID → 6-digit serial | Domain rule — documented in comment, OK |
| `barcodeId = '00'` | `src/lib/barcode-helpers.ts:22` | IMb header byte | OK (domain constant, inline) |

**No hardcoded MP table-IDs, Event_Type_IDs, Contact_Status_IDs, Page_IDs, or Household_Position_IDs appear in `src/` business code.** (Verified via `Grep` for `Page_ID\s*=\s*\d+`, `Event_Type_ID\s*=\s*\d+`, `Group_Type_ID\s*=\s*\d+`, `Contact_Status_ID\s*=\s*\d+`, `Household_Position_ID\s*=\s*\d+` — zero hits in `src/` outside generated `models/` and doc-comment examples.)

## Usage

Service-side SQL-safety pattern (from `src/services/groupService.ts:150-177`):

```typescript
import { escapeFilterString, validatePositiveInt } from '@/lib/validation';

const escaped = escapeFilterString(term);
// ... filter: `Group_Name LIKE '%${escaped}%'`

// Numeric path safety
filter: `Group_ID = ${validatePositiveInt(groupId)}`
```

```typescript
// src/services/userService.ts:70-85
return this.mp!.getTableRecords<User>({
  table: 'dp_Users',
  filter: `User_GUID = '${validateGuid(guid)}'`,
  // ...
});
```

## Gotchas

- **Two `BATCH_SIZE = 100` constants.** Module-local in `addressLabelService.ts:21`; class-static in `toolService.ts:283`. Drift risk if MP API limit changes. See TODO `2026-04-17-dto-constants-batchsize-duplication.md`.
- **`MAX_TEMPLATE_SIZE` and `MAX_FILE_SIZE` are both 5MB** and mirror each other across server (`actions.ts:203`) and client (`mail-merge-tab.tsx:13`). Drift risk.
- **`escapeFilterString` escapes `%` + `_` + `'`** — not generic SQL escaping, specific to MP OData/LIKE. Do NOT use it as a universal SQL sanitizer.
- **`validatePositiveInt` rejects 0** (strictly positive). If you need non-negative int accept `>= 0`, write a new helper.
- **`validateGuid` accepts upper- or lower-case hex** but NOT braces (no `{xxx-xxx}` form). Confirmed by `src/lib/validation.test.ts:11-13`.

## Related docs

- `dtos.md` — DTO shapes that USE these constants (e.g., `LabelConfig.serviceType: string` maps to `SERVICE_TYPES[i].id`)
- `../services/README.md` — all four validation helpers are consumed here
- `../utils/README.md` — barcode/label-stock utilities (separate domain; this doc only inventories the constants)

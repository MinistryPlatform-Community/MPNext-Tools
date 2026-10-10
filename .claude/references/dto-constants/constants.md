---
title: Shared Constants & Validation Helpers
domain: dto-constants
type: reference
applies_to: [src/lib/constants.ts, src/lib/dto/address-label.dto.ts, src/lib/label-stock.ts, src/lib/validation.ts, src/components/group-wizard/types.ts, src/services/familyService.ts, src/components/address-labels/limits.ts]
symbols: [MP_FETCH_BATCH_SIZE, SERVICE_TYPES, LABEL_STOCKS, LabelStockConfig, LabelPosition, WIZARD_STEPS, WizardStepIndex, validateGuid, validatePositiveInt, validateColumnName, validateFkPath, validateMailerId, escapeFilterString, MAX_SEARCH_TERM_LENGTH, MAX_TEMPLATE_BYTES, MAX_TEMPLATE_LABEL, MAX_LABELS, TEMPLATE_ZIP_LIMITS]
related: [dtos.md, ../services/README.md, ../services/query-patterns.md, ../utils/README.md]
last_verified: 2026-10-10
---

## Purpose
Inventory of module-level runtime constants and SQL-safety validation helpers. Also flags hardcoded IDs / magic numbers that are candidates for extraction.

## Files

- `src/lib/constants.ts` — `MP_FETCH_BATCH_SIZE = 100` (shared IN-clause batch size)
- `src/lib/dto/address-label.dto.ts:26-32` — `SERVICE_TYPES`
- `src/lib/label-stock.ts` — `LABEL_STOCKS` (Avery sheet dimensions)
- `src/lib/validation.ts` — 5 filter/select guards + `validateMailerId`, `MAX_SEARCH_TERM_LENGTH`
- `src/lib/validation.test.ts` — 33 test cases
- `src/components/group-wizard/types.ts:51-60` — `WIZARD_STEPS`, `WizardStepIndex`
- `src/components/address-labels/limits.ts` — `MAX_TEMPLATE_BYTES`, `MAX_TEMPLATE_LABEL`, `MAX_LABELS`, `TEMPLATE_ZIP_LIMITS`

## Key concepts

- Constants are **not centralized** — each lives next to its consumer (`src/lib/dto/*`, `src/lib/label-stock.ts`, `src/components/*/types.ts`, `src/components/address-labels/limits.ts`). `src/lib/constants.ts` holds only the cross-service `MP_FETCH_BATCH_SIZE`.
- `validation.ts` is the single SQL-safety entry point; services route every interpolated value through one of its helpers before building a `$filter` / `$select`.
- Validator errors name the field, never the value (CLAUDE.md rule 14), and every validator checks the runtime type (server-action payloads are caller-shaped).

## API / Interface

### Runtime enum-like constants

```typescript
// src/lib/constants.ts
/** Max contact/record IDs to bundle in a single MP $filter `IN (...)` clause. */
export const MP_FETCH_BATCH_SIZE = 100;
```

Used by `AddressLabelService.getAddressesForContacts` and `ToolService.resolveContactIds`.

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

USPS service type codes drive `LabelConfig.serviceType`; `labelConfigSchema` (`src/components/address-labels/schemas.ts`) restricts it to these ids server-side. Default selected in UI is `'040'` (`src/app/(web)/tools/addresslabels/address-labels.tsx:53`).

```typescript
// src/lib/label-stock.ts:23
export const LABEL_STOCKS: LabelStockConfig[] = [
  { id: '5160', name: 'Avery 5160 (30/sheet)', pageWidth: 612, pageHeight: 792,
    labelWidth: 189, labelHeight: 72, columns: 3, rows: 10,
    marginTop: 36, marginLeft: 13.5, columnGap: 9, rowGap: 0 },
  // 5161, 5162, 5163 ...
];
```

Dimensions in PDF points (72pt = 1in). `getLabelStock(id)` lookup + `getLabelPosition(stock, index)` at `src/lib/label-stock.ts:82-98`.

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
const MAILER_ID_REGEX = /^(\d{6}|\d{9})$/;

export function validateGuid(value: string): string;
export function validatePositiveInt(value: number, field?: string): number;   // positive SAFE integer
export function validateColumnName(value: string): string;
export function validateFkPath(value: unknown, field = 'column path'): string; // `A_TABLE.Col`, ≤4 `_TABLE` segments, ≤256 chars
export function validateMailerId(value: string): string;                       // exactly 6 or 9 digits
export const MAX_SEARCH_TERM_LENGTH = 100;
export function escapeFilterString(value: string): string;
```

`escapeFilterString` (MP filter uses SQL `LIKE` semantics):

```typescript
// src/lib/validation.ts:127-144 (abridged)
export function escapeFilterString(value: string): string {
  // throws on non-string, length > MAX_SEARCH_TERM_LENGTH, or ASCII control chars
  return value
    .replace(/\[/g, '[[]')
    .replace(/%/g, '[%]')
    .replace(/_/g, '[_]')
    .replace(/'/g, "''")
    .replace(QUOTE_LOOKALIKES, '_');
}
```

## Consumer map

| Symbol | Consumers (non-test) |
|--------|-----------|
| `MP_FETCH_BATCH_SIZE` | `src/services/addressLabelService.ts`, `src/services/toolService.ts` |
| `SERVICE_TYPES` | `src/components/address-labels/address-labels-form.tsx:9,128`, `src/components/address-labels/schemas.ts` |
| `LABEL_STOCKS` | `src/lib/label-stock.ts` (internal), `src/components/address-labels/address-labels-form.tsx` |
| `getLabelStock` | `src/components/address-labels/actions.ts`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `WIZARD_STEPS` | `src/components/group-wizard/*` |
| `validateGuid` | `src/services/userService.ts`, `src/services/authorizationService.ts`, `src/lib/auth.ts`, `src/lib/providers/ministry-platform/services/guards.ts` |
| `validatePositiveInt` | `src/services/{toolService,addressLabelService,groupService,familyService}.ts`, `src/app/(web)/tools/addeditfamily/actions.ts`, `src/lib/providers/ministry-platform/services/guards.ts` |
| `validateColumnName` | `src/services/toolService.ts`, `src/services/familyService.ts` |
| `validateFkPath` | `src/services/toolService.ts`, `src/services/familyService.ts` |
| `validateMailerId` | `src/lib/barcode-helpers.ts`, `src/components/address-labels/actions.ts` |
| `escapeFilterString` | `src/services/groupService.ts`, `src/services/familyService.ts`, `src/services/toolService.ts` (`listRoles`) |

## How it works

- `as const` tuples give literal-typed ids to `SERVICE_TYPES`, `WIZARD_STEPS`, etc.
- `LABEL_STOCKS` is a mutable-typed array (`LabelStockConfig[]`) — NOT `as const`. If mutation-safety is desired this is a refactor candidate.
- The validators throw on bad input; callers rely on the throw (no return-based error).
- `escapeFilterString` returns the escaped string; callers interpolate it into the `$filter`.

## Magic-number / hardcoded-ID audit

Items found in `src/` outside `src/lib/dto/` and `src/lib/validation.ts`:

| Literal | Location | Meaning | Extraction candidate? |
|---------|----------|---------|-----------------------|
| `MP_FETCH_BATCH_SIZE = 100` | `src/lib/constants.ts` | MP record fetch batch size | Done — single shared export |
| `MAX_TEMPLATE_BYTES = 2 * 1024 * 1024` / `MAX_TEMPLATE_LABEL = '2MB'` | `src/components/address-labels/limits.ts` | Mail-merge `.docx` template cap; one export used by client `mail-merge-tab.tsx` and server `actions.ts` (`mergeTemplate`) | Done — single shared constant |
| `MAX_LABELS = 10_000` | `src/components/address-labels/limits.ts` | Labels per render request (`parseLabelInput` in `schemas.ts`) | Done |
| `TEMPLATE_ZIP_LIMITS = { maxEntries: 1_000, maxTotalBytes: 64 MB }` | `src/components/address-labels/limits.ts` | Zip-bomb bounds passed to `assertZipWithinLimits` (`src/lib/zip-guard.ts`) | Done |
| `bodySizeLimit: "4mb"` | `next.config.ts` (`experimental.serverActions`) | Server-action request cap; sized with `limits.ts` under Vercel's 4.5 MB body cap | Coupled config — change with `limits.ts` |
| `'040'` default | `src/app/(web)/tools/addresslabels/address-labels.tsx:53` | Default USPS service type | Consider `DEFAULT_SERVICE_TYPE = SERVICE_TYPES[0].id` |
| `serialLength = mailerId.length === 6 ? 9 : 6` | `src/lib/barcode-helpers.ts:25` | USPS IMb rule: 6-digit MID → 9-digit serial, 9-digit MID → 6-digit serial | Domain rule — documented in comment, OK |
| `barcodeId = '00'` | `src/lib/barcode-helpers.ts:24` | IMb header byte | OK (domain constant, inline) |
| `DEFAULT_FAMILY_DEFAULTS` — `congregationId: 1`, `sourceId: 18`, `householdPositionId: 1`, `participantTypeId: 4` | `src/services/familyService.ts:73-81` | Add/Edit Family form defaults (MP lookup IDs) | Yes — domain-specific MP IDs; candidates for `dp_Configuration_Settings` |
| `DONOR_DEFAULTS` — `Statement_Frequency_ID: 1`, `Statement_Type_ID: 1`, `Statement_Method_ID: 1` | `src/services/familyService.ts:31-36` | New donor statement settings (Quarterly / Individual / Postal Mail) | Yes — same reason |
| `Contact_Status_ID = 1` | `src/services/familyService.ts:131` (`searchContacts` filter); `|| 1` fallback in `saveMember` | "Active" contact status | Yes |

Group wizard, address labels, field management and tool code contain no hardcoded MP lookup IDs. The family tool does (above) — the MP IDs it assumes must exist in the target domain.

## Usage

Service-side SQL-safety pattern (from `src/services/groupService.ts:257-291`):

```typescript
import { escapeFilterString, validatePositiveInt } from '@/lib/validation';

const escaped = escapeFilterString(term);
// ... filter: `Group_Name LIKE '${escaped}%' AND End_Date IS NULL`

// Numeric path safety
filter: `Groups.Group_ID = ${validatePositiveInt(groupId)}`
```

```typescript
// src/services/userService.ts — UserService.getUserProfile
const records = await this.mp!.getTableRecords<MPUserProfile>({
  table: "dp_Users",
  filter: `User_GUID = '${validateGuid(id)}'`,
  // ...
});
```

## Gotchas

- **Template size cap is one constant.** The former duplicated 5 MB literals were replaced by `MAX_TEMPLATE_BYTES` (2 MB) in `src/components/address-labels/limits.ts`. Raising it means re-checking `next.config.ts` `bodySizeLimit` and Vercel's 4.5 MB cap together.
- **`escapeFilterString` is LIKE-specific** (`[`, `%`, `_`, `'`, quote look-alikes) and throws on >100 chars or control characters — not a universal SQL sanitizer, and not for identifiers (use `validateColumnName` / `validateFkPath`).
- **`validatePositiveInt` rejects 0** (strictly positive) and anything beyond `Number.MAX_SAFE_INTEGER`. If you need non-negative ints, write a new helper.
- **`validateGuid` accepts upper- or lower-case hex** (`/i`) but NOT braces (no `{xxx-xxx}` form) — the regex is anchored.

## Related docs

- `dtos.md` — DTO shapes that USE these constants (e.g., `LabelConfig.serviceType: string` maps to `SERVICE_TYPES[i].id`)
- `../services/query-patterns.md` — how services apply the validators
- `../services/README.md` — the services that consume them
- `../utils/README.md` — barcode/label-stock utilities (separate domain; this doc only inventories the constants)

---
title: Hand-written DTOs / ViewModels
domain: dto-constants
type: reference
applies_to: [src/lib/dto/address-label.dto.ts, src/lib/dto/index.ts, src/lib/tool-params.ts, src/components/group-wizard/types.ts, src/services/addressLabelService.ts]
symbols: [LabelData, SkipReason, SkipRecord, AddressMode, BarcodeFormat, LabelConfig, FetchAddressLabelsResult, ContactAddressRow, PageData, ToolParams, LookupItem, GroupWizardLookups, ContactSearchResult, GroupSearchResult, CreateGroupResult, UpdateGroupResult, ActionError]
related: [constants.md, ../services/README.md, ../mp-provider/README.md]
last_verified: 2026-04-17
---

## Purpose
Hand-written application-layer view models, separate from the 603 auto-generated MP table/view models in `src/lib/providers/ministry-platform/models/`. DTOs here shape data for UI + server actions; they are not 1:1 with DB rows.

## Files

- `src/lib/dto/address-label.dto.ts` — all current `@/lib/dto` exports (one file)
- `src/lib/dto/index.ts` — barrel re-export
- `src/lib/tool-params.ts` — `PageData`, `ToolParams` (URL-param view models, not re-exported from `@/lib/dto`)
- `src/components/group-wizard/types.ts` — wizard view models co-located with the feature
- `src/services/addressLabelService.ts:4-19` — `ContactAddressRow` (MP-row DTO co-located with service)

## Key concepts

- **DTO (Data Transfer Object) / ViewModel** — hand-written TypeScript type shaping data between layers (service → action → component, or URL → server). Distinct from generated MP schemas which mirror DB columns.
- **Barrel import** — consumers use `import type { ... } from '@/lib/dto'`; internal file is `address-label.dto.ts` but all access goes through `index.ts`.
- **Co-location** — feature-specific view models (e.g. `GroupSearchResult`, `WIZARD_STEPS`) live next to the feature, not in `src/lib/dto/`. Only cross-feature DTOs live in `src/lib/dto/`.

## API / Interface

### `src/lib/dto/address-label.dto.ts`

```typescript
export interface LabelData {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  barCode?: string;
  deliveryPointCode?: string;
  /** Pre-encoded bar states for PDF rendering (IMb: 65 chars of T/D/A/F, or POSTNET: tall/short array as JSON) */
  barStates?: string;
  barType?: 'imb' | 'postnet';
}

export type SkipReason = 'no_address' | 'no_postal_code' | 'opted_out' | 'no_barcode' | 'no_household';

export interface SkipRecord {
  name: string;
  contactId: number;
  reason: SkipReason;
}

export type AddressMode = 'household' | 'individual';
export type BarcodeFormat = 'imb' | 'postnet' | 'none';

export interface LabelConfig {
  stockId: string;
  addressMode: AddressMode;
  startPosition: number;
  includeMissingBarcodes: boolean;
  barcodeFormat: BarcodeFormat;
  mailerId: string;
  serviceType: string;
}

export interface FetchAddressLabelsResult {
  printable: LabelData[];
  skipped: SkipRecord[];
}
```

### `src/services/addressLabelService.ts:4-19`

```typescript
export interface ContactAddressRow {
  Contact_ID: number;
  Display_Name: string;
  First_Name: string;
  Last_Name: string;
  Household_ID: number | null;
  Household_Name: string | null;
  Bulk_Mail_Opt_Out: boolean;
  Address_Line_1: string | null;
  Address_Line_2: string | null;
  City: string | null;
  'State/Region': string | null;
  Postal_Code: string | null;
  Bar_Code: string | null;
  Delivery_Point_Code: string | null;
}
```

### `src/lib/tool-params.ts:3-28`

```typescript
export interface PageData {
  Page_ID: number;
  Display_Name: string;
  Singular_Name: string;
  Table_Name: string;
  Primary_Key: string;
  Selected_Record_Expression?: string;
  Start_Date_Field?: string;
  End_Date_Field?: string;
  Contact_ID_Field?: string;
  Filter_Clause?: string;
  Global_Filter_ID_Field?: string;
}

export interface ToolParams {
  pageID?: number;
  s?: number;
  sc?: number;
  p?: number;
  q?: string;
  v?: number;
  recordID?: number;
  recordDescription?: string;
  addl?: string;
  pageData?: PageData;
}
```

### `src/components/group-wizard/types.ts`

```typescript
export interface LookupItem { id: number; name: string; }

export interface GroupWizardLookups {
  groupTypes: LookupItem[];
  ministries: LookupItem[];
  congregations: LookupItem[];
  meetingDays: LookupItem[];
  meetingFrequencies: LookupItem[];
  meetingDurations: LookupItem[];
  lifeStages: LookupItem[];
  groupFocuses: LookupItem[];
  priorities: LookupItem[];
  rooms: LookupItem[];
  books: LookupItem[];
  smsNumbers: LookupItem[];
  groupEndedReasons: LookupItem[];
}

export interface ContactSearchResult {
  Contact_ID: number;
  Display_Name: string;
  Email_Address: string | null;
}

export interface GroupSearchResult {
  Group_ID: number;
  Group_Name: string;
  Group_Type: string | null;
}

export interface CreateGroupResult { success: true; groupId: number; groupName: string; }
export interface UpdateGroupResult { success: true; groupId: number; groupName: string; }
export interface ActionError { success: false; error: string; }
```

## DTO consumer map

| DTO | Defined | Imported by |
|-----|---------|-------------|
| `LabelData` | `src/lib/dto/address-label.dto.ts:1` | `src/lib/barcode-helpers.ts:3`, `src/lib/barcode-helpers.test.ts:3`, `src/components/address-labels/actions.ts:14`, `src/components/address-labels/actions.test.ts:91`, `src/components/address-labels/address-label.tsx:4`, `src/components/address-labels/label-document.tsx:5`, `src/components/address-labels/mail-merge-tab.tsx:11`, `src/components/address-labels/word-document.ts:17`, `src/components/address-labels/word-document.test.ts:5`, `src/app/(web)/tools/addresslabels/address-labels.tsx:13` |
| `SkipReason` | `src/lib/dto/address-label.dto.ts:15` | (indirect, through `SkipRecord`) |
| `SkipRecord` | `src/lib/dto/address-label.dto.ts:17` | `src/components/address-labels/actions.ts:15`, `src/components/address-labels/mail-merge-tab.tsx:11`, `src/components/address-labels/address-labels-summary.tsx:6`, `src/app/(web)/tools/addresslabels/address-labels.tsx:13` |
| `AddressMode` | `src/lib/dto/address-label.dto.ts:23` | `src/components/address-labels/address-labels-form.tsx:10` |
| `BarcodeFormat` | `src/lib/dto/address-label.dto.ts:24` | `src/components/address-labels/address-labels-form.tsx:10` |
| `LabelConfig` | `src/lib/dto/address-label.dto.ts:34` | `src/lib/barcode-helpers.ts:3`, `src/components/address-labels/actions.ts:16`, `src/components/address-labels/address-labels-form.tsx:10`, `src/components/address-labels/mail-merge-tab.tsx:11`, `src/app/(web)/tools/addresslabels/address-labels.tsx:13`, plus tests |
| `FetchAddressLabelsResult` | `src/lib/dto/address-label.dto.ts:44` | `src/components/address-labels/actions.ts:17` |
| `ContactAddressRow` | `src/services/addressLabelService.ts:4` | `src/components/address-labels/actions.ts:11` |
| `PageData` | `src/lib/tool-params.ts:3` | Tools routing layer (URL → page metadata) |
| `ToolParams` | `src/lib/tool-params.ts:17` | Tools routing layer |
| Group-wizard view models | `src/components/group-wizard/types.ts` | Group-wizard components + actions |

## How it works

- `@/lib/dto` is the only centralized DTO module. Address-label feature is the single "cross-concern" set because it is consumed by services, actions, components, and a PDF document renderer.
- Feature-local DTOs (group wizard, tool-params) are **not** re-exported through `@/lib/dto` — they live beside their consumers.
- Service-layer row shapes (e.g. `ContactAddressRow`) are DTOs of the **MP-response shape** (matches `$select` field list at `src/services/addressLabelService.ts:23-38`), not generated from schema.
- `LabelData` is transformed from `ContactAddressRow` in `filterAndTransform()` at `src/components/address-labels/actions.ts:42-96`.
- `preEncodeBarcodes(labels, config)` at `src/lib/barcode-helpers.ts:33` mutates `LabelData[]` by adding `barStates` + `barType` based on `LabelConfig`.

## Usage

Consumer example (form + server action):

```typescript
// src/components/address-labels/actions.ts:13-18
import type {
  LabelData,
  SkipRecord,
  LabelConfig,
  FetchAddressLabelsResult,
} from '@/lib/dto';
```

```typescript
// src/components/address-labels/address-labels-form.tsx:9-10
import { SERVICE_TYPES } from '@/lib/dto';
import type { AddressMode, BarcodeFormat, LabelConfig } from '@/lib/dto';
```

## Gotchas

- **Naming drift between DTO and service row.** `LabelData` uses camelCase (`addressLine1`, `postalCode`) while `ContactAddressRow` uses MP field names (`Address_Line_1`, `Postal_Code`). Transform happens at `src/components/address-labels/actions.ts:42-96`. Do NOT propagate snake_case MP names into UI-layer DTOs.
- **`SkipRecord.name` is the computed display label**, not `Display_Name`. It is either `Household_Name` (household mode) or `Display_Name` (individual mode), fallback chain at `src/components/address-labels/actions.ts:51-53`.
- **`FetchAddressLabelsResult` has fields `printable` + `skipped`** — NOT `labels` / `totalFetched`.
- **DTOs are not validated at runtime.** No Zod schema wraps `LabelConfig` etc. User input in `mailerId` is only stripped to 9 digits at `src/components/address-labels/address-labels-form.tsx:109`.

## Related docs

- `constants.md` — `SERVICE_TYPES`, `LABEL_STOCKS`, `WIZARD_STEPS`, SQL validation helpers
- `../services/README.md` — services using `validatePositiveInt` / `escapeFilterString` / `validateGuid` + returning these DTOs
- `../mp-provider/README.md` — generated Zod schemas (application-level DTOs exist alongside those, by design)

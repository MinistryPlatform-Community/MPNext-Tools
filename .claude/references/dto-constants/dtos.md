---
title: Hand-written DTOs / ViewModels
domain: dto-constants
type: reference
applies_to: [src/lib/dto/address-label.dto.ts, src/lib/dto/family.ts, src/lib/dto/index.ts, src/lib/tool-params.ts, src/components/group-wizard/types.ts, src/components/address-labels/schemas.ts, src/services/addressLabelService.ts]
symbols: [LabelData, SkipReason, SkipRecord, AddressMode, BarcodeFormat, LabelConfig, FetchAddressLabelsResult, Household, FamilyMember, FamilyAddress, FamilyMemberParticipant, FamilyLookups, FamilyDefaults, LookupOption, StateOption, CountryOption, SaveProgress, SavedMemberId, HouseholdSchema, ContactAddressRow, PageData, ToolParams, LookupItem, GroupWizardLookups, ContactSearchResult, GroupSearchResult, CreateGroupResult, UpdateGroupResult, ActionError]
related: [constants.md, ../services/README.md, ../services/family-service.md, ../mp-provider/README.md]
last_verified: 2026-10-10
---

## Purpose
Hand-written application-layer view models, separate from the auto-generated MP models in `src/lib/providers/ministry-platform/models/` (301 table interfaces + 301 `*Schema.ts` Zod schemas + `index.ts`). DTOs here shape data for UI + server actions; they are not 1:1 with DB rows.

## Files

- `src/lib/dto/address-label.dto.ts` — address-label DTOs + `SERVICE_TYPES`
- `src/lib/dto/family.ts` — Add/Edit Family DTOs: Zod schemas (`HouseholdSchema` etc.) with inferred types, plain interfaces, and `emptyAddress` / `emptyMember` / `emptyHousehold` factories
- `src/lib/dto/index.ts` — barrel re-export of both files
- `src/lib/tool-params.ts` — `PageData`, `ToolParams` (URL-param view models, not re-exported from `@/lib/dto`)
- `src/components/group-wizard/types.ts` — wizard view models co-located with the feature
- `src/components/address-labels/schemas.ts` — server-side Zod schemas for `LabelData[]` / `LabelConfig` (`labelDataSchema`, `labelsSchema`, `labelConfigSchema`, `parseLabelInput`)
- `src/services/addressLabelService.ts:7-22` — `ContactAddressRow` (MP-row DTO co-located with service)

## Key concepts

- **DTO (Data Transfer Object) / ViewModel** — hand-written TypeScript type shaping data between layers (service → action → component, or URL → server). Distinct from generated MP schemas which mirror DB columns.
- **Barrel import** — address-label consumers use `import type { ... } from '@/lib/dto'`. Family consumers (`addeditfamily/actions.ts`, `add-edit-family.tsx`, `familyService.ts`) import `@/lib/dto/family` directly; both paths resolve to the same module.
- **Co-location** — feature-specific view models (e.g. `GroupSearchResult`, `WIZARD_STEPS`) live next to the feature, not in `src/lib/dto/`.
- **Two `ContactSearchResult` types** — `@/lib/dto/family` (`{ contactId, displayName, detail }`) and `src/components/group-wizard/types.ts` (`{ Contact_ID, Display_Name, Email_Address }`). Same name, different shapes; import the one for your feature.

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

### `src/lib/dto/family.ts` (abridged)

```typescript
export const FamilyAddressSchema = z.object({ addressId, addressLine1, addressLine2, city, state, region, postalCode, countryCode });
export const FamilyMemberParticipantSchema = z.object({ participantId, participantTypeId, notes });
export const FamilyMemberSchema = z.object({ contactId, firstName, lastName, /* ...names, IDs, contact info */, envelopeNo, participant, donorId, isDonor });
export const HouseholdSchema = z.object({
  householdId, householdName, householdPhone, congregationId, sourceId,
  address: FamilyAddressSchema, alternateMailingAddress: FamilyAddressSchema,
  seasonStart, seasonEnd, repeatsAnnually, areHeadsMarried,
  members: z.array(FamilyMemberSchema),
});
export type Household = z.infer<typeof HouseholdSchema>;   // likewise FamilyAddress, FamilyMember, FamilyMemberParticipant

export interface FamilyLookups { congregations, sources, householdPositions, participantTypes, maritalStatuses,
  prefixes, suffixes, genders, contactStatuses, primaryLanguages, faithBackgrounds: LookupOption[];
  states: StateOption[]; countries: CountryOption[]; }
export interface FamilyDefaults { congregationId; sourceId; countryCode; state; householdPositionId; participantTypeId; showEnvelopeNumbers; }
export interface ContactSearchResult { contactId: number; displayName: string; detail: string; }
export interface SavedMemberId { tempContactId; contactId; participantId; donorId; envelopeNo; envelopeBumped; }
export interface SaveProgress { mainAddressId; altAddressId; householdId; members: SavedMemberId[]; }
```

- `HouseholdSchema` is the runtime guard for the `saveFamily` action (`safeParse` before `FamilyService.saveHousehold`).
- `SaveProgress` is returned on success **and** on `PartialSaveError`, so the client can retry without duplicating records.

### `src/services/addressLabelService.ts:7-22`

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

### `src/lib/tool-params.ts:14-39`

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

| DTO | Defined | Imported by (non-test) |
|-----|---------|-------------|
| `LabelData` | `src/lib/dto/address-label.dto.ts:1` | `src/lib/barcode-helpers.ts`, `src/components/address-labels/{actions,schemas,word-document}.ts`, `src/components/address-labels/{address-label,label-document,mail-merge-tab}.tsx`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `SkipReason` | `src/lib/dto/address-label.dto.ts:15` | (indirect, through `SkipRecord`) |
| `SkipRecord` | `src/lib/dto/address-label.dto.ts:17` | `src/components/address-labels/actions.ts`, `mail-merge-tab.tsx`, `address-labels-summary.tsx`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `AddressMode` / `BarcodeFormat` | `src/lib/dto/address-label.dto.ts:23-24` | `src/components/address-labels/address-labels-form.tsx` |
| `LabelConfig` | `src/lib/dto/address-label.dto.ts:34` | `src/lib/barcode-helpers.ts`, `src/components/address-labels/{actions,schemas}.ts`, `address-labels-form.tsx`, `mail-merge-tab.tsx`, `src/app/(web)/tools/addresslabels/address-labels.tsx` |
| `FetchAddressLabelsResult` | `src/lib/dto/address-label.dto.ts:44` | `src/components/address-labels/actions.ts` |
| Family DTOs / `HouseholdSchema` | `src/lib/dto/family.ts` | `src/services/familyService.ts`, `src/app/(web)/tools/addeditfamily/actions.ts`, `src/app/(web)/tools/addeditfamily/add-edit-family.tsx` |
| `ContactAddressRow` | `src/services/addressLabelService.ts:7` | `src/components/address-labels/actions.ts` |
| `PageData` / `ToolParams` | `src/lib/tool-params.ts:14`, `:28` | `src/lib/tool-params.server.ts`, `src/services/toolService.ts`, tool pages/components, dev-panel |
| Group-wizard view models | `src/components/group-wizard/types.ts` | Group-wizard components + actions, `src/services/groupService.ts` |

## How it works

- `@/lib/dto` holds the cross-concern DTO sets: address labels (consumed by services, actions, components, PDF/Word renderers) and Add/Edit Family (service, actions, client component).
- Feature-local DTOs (group wizard, tool-params) are **not** re-exported through `@/lib/dto` — they live beside their consumers.
- Service-layer row shapes (e.g. `ContactAddressRow`) are DTOs of the **MP-response shape** (matches the `SELECT_FIELDS` list at `src/services/addressLabelService.ts:24-39`), not generated from schema.
- `LabelData` is transformed from `ContactAddressRow` in `filterAndTransform()` at `src/components/address-labels/actions.ts:52-114`.
- `preEncodeBarcodes(labels, config)` at `src/lib/barcode-helpers.ts:45` returns a new `LabelData[]` with `barStates` + `barType` added according to `LabelConfig`.

## Usage

Consumer example (form + server action):

```typescript
// src/components/address-labels/actions.ts:11-16
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

- **Naming drift between DTO and service row.** `LabelData` uses camelCase (`addressLine1`, `postalCode`) while `ContactAddressRow` uses MP field names (`Address_Line_1`, `Postal_Code`). Transform happens in `filterAndTransform` (`src/components/address-labels/actions.ts:52-114`). Do NOT propagate snake_case MP names into UI-layer DTOs.
- **`SkipRecord.name` is the computed display label**, not `Display_Name`. It is either `Household_Name` (household mode, falling back to `Display_Name`) or `Display_Name` (individual mode) — `src/components/address-labels/actions.ts:61-63`.
- **`FetchAddressLabelsResult` has fields `printable` + `skipped`** — NOT `labels` / `totalFetched`.
- **Runtime validation lives beside the action, not on the DTO.** `LabelData` / `LabelConfig` are plain interfaces; the render actions validate caller input with `parseLabelInput` (`src/components/address-labels/schemas.ts`), which bounds string lengths, caps the count at `MAX_LABELS`, restricts `serviceType` to `SERVICE_TYPES` ids, and **drops** `barStates` / `barType` (computed server-side). The form also strips `mailerId` to ≤9 digits (`src/components/address-labels/address-labels-form.tsx:109`). Family DTOs are the exception: they *are* Zod schemas.

## Related docs

- `constants.md` — `SERVICE_TYPES`, `LABEL_STOCKS`, `WIZARD_STEPS`, SQL validation helpers
- `../services/README.md` — services using `validatePositiveInt` / `escapeFilterString` / `validateGuid` + returning these DTOs
- `../services/family-service.md` — consumer of the family DTOs
- `../mp-provider/README.md` — generated Zod schemas (application-level DTOs exist alongside those, by design)

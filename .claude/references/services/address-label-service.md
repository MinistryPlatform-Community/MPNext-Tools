---
title: AddressLabelService
domain: services
type: reference
applies_to: [src/services/addressLabelService.ts, src/services/addressLabelService.test.ts]
symbols: [AddressLabelService, ContactAddressRow]
related: [query-patterns.md, ../dto-constants/dtos.md, ../components/address-labels.md]
last_verified: 2026-04-17
---

## Purpose
Fetch mailing addresses for one or many contacts by traversing `Contacts → Households → Addresses` via multi-level FK joins. Backs the address-label print feature.

## Files
- `src/services/addressLabelService.ts` — singleton (105 lines)
- `src/services/addressLabelService.test.ts` — 110 lines; covers singleton, happy path, batching (250 IDs → multiple calls), empty input, single-contact lookup

## Singleton
```typescript
// src/services/addressLabelService.ts:45-63
export class AddressLabelService {
  private static instance: AddressLabelService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<AddressLabelService> { ... }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## API

| Method | Returns | Behavior |
|--------|---------|----------|
| `getAddressesForContacts(contactIds: number[])` | `ContactAddressRow[]` | Batches of 100, validates each ID with `validatePositiveInt`, orders by Postal_Code |
| `getAddressForContact(contactId: number)` | `ContactAddressRow \| null` | Single-row lookup, `top: 1` |

## Shared select (multi-level FK traversal)

```typescript
// src/services/addressLabelService.ts:23-38
const SELECT_FIELDS = [
  'Contact_ID',
  'Display_Name',
  'First_Name',
  'Last_Name',
  'Contacts.Household_ID',                                       // prefixed — Households also has Household_ID
  'Household_ID_TABLE.Household_Name',
  'Household_ID_TABLE.Bulk_Mail_Opt_Out',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_1',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_2',
  'Household_ID_TABLE_Address_ID_TABLE.City',
  'Household_ID_TABLE_Address_ID_TABLE.[State/Region]',          // bracket notation for `/`
  'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Bar_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Delivery_Point_Code',
].join(', ');
```

Key rules (see `query-patterns.md`):
- **1 level**: `Household_ID_TABLE.Household_Name` → traverses `Contacts.Household_ID` → `Households.Household_Name`
- **2 levels**: `Household_ID_TABLE_Address_ID_TABLE.City` → traverses `Contacts.Household_ID` → `Households.Address_ID` → `Addresses.City`. Underscores between `_TABLE_`, dot only before the final field.
- **Ambiguous column**: `Contacts.Household_ID` — the join makes `Household_ID` ambiguous (exists on both Contacts and Households), so the select prefixes with `Contacts.`
- **Special character**: `[State/Region]` in bracket notation because of the `/`

## getAddressesForContacts (batched)

```typescript
// src/services/addressLabelService.ts:21, 69-90
const BATCH_SIZE = 100;

async getAddressesForContacts(contactIds: number[]): Promise<ContactAddressRow[]> {
  if (contactIds.length === 0) return [];

  const results: ContactAddressRow[] = [];

  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    batch.forEach(validatePositiveInt);
    const idList = batch.join(', ');

    const rows = await this.mp!.getTableRecords<ContactAddressRow>({
      table: 'Contacts',
      select: SELECT_FIELDS,
      filter: `Contact_ID IN (${idList})`,
      orderBy: 'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
    });

    results.push(...rows);
  }

  return results;
}
```

| Param | Value |
|-------|-------|
| `table` | `Contacts` |
| `select` | `SELECT_FIELDS` (above) |
| `filter` | `Contact_ID IN ({batch.join(', ')})` |
| `orderBy` | `Household_ID_TABLE_Address_ID_TABLE.Postal_Code` |

## getAddressForContact

```typescript
// src/services/addressLabelService.ts:95-104
async getAddressForContact(contactId: number): Promise<ContactAddressRow | null> {
  const rows = await this.mp!.getTableRecords<ContactAddressRow>({
    table: 'Contacts',
    select: SELECT_FIELDS,
    filter: `Contact_ID = ${contactId}`,
    top: 1,
  });
  return rows[0] ?? null;
}
```

<!-- Note: getAddressForContact does NOT call validatePositiveInt — tracked in TODO 2026-04-17-services-get-address-for-contact-unvalidated.md -->

## Return type

```typescript
// src/services/addressLabelService.ts:4-19
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
  'State/Region': string | null;     // quoted key — `/` in name
  Postal_Code: string | null;
  Bar_Code: string | null;
  Delivery_Point_Code: string | null;
}
```

## DTOs used downstream

The server action (`src/components/address-labels/actions.ts`) transforms `ContactAddressRow[]` into `LabelData[]` / `SkipRecord[]` — see `../dto-constants/dtos.md` for `LabelData`, `SkipRecord`, `SkipReason`, `AddressMode`, `BarcodeFormat`, `LabelConfig`, `FetchAddressLabelsResult`.

## Consumers

| Action | File | Methods |
|--------|------|---------|
| `fetchAddressLabels` | `src/components/address-labels/actions.ts` | `getAddressesForContacts` (selection mode), `getAddressForContact` (single record) |

## Gotchas
- Returning `[]` for empty input skips the API call — don't "helpfully" add a default.
- `Contacts.Household_ID` must stay prefixed — removing the `Contacts.` prefix will 500 with "ambiguous column".
- `[State/Region]` must stay in brackets in the select; the TS key is `'State/Region'` (single-quoted).
- `ContactAddressRow` returned from MP can have `Household_ID: null` when the contact isn't linked to a household — downstream filters must handle it.

## Related docs
- `query-patterns.md` — FK traversal rules and batching
- `../dto-constants/dtos.md` — `LabelData`, `FetchAddressLabelsResult`
- `../components/address-labels.md` — consuming UI

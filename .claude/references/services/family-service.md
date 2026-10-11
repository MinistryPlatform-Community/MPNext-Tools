---
title: FamilyService
domain: services
type: reference
applies_to: [src/services/familyService.ts, src/services/familyService.test.ts, src/lib/dto/family.ts]
symbols: [FamilyService, PartialSaveError]
related: [query-patterns.md, tool-service.md, ../dto-constants/dtos.md, ../routing/app-router.md, ../ministryplatform.datetimehandling.md]
last_verified: 2026-10-10
---

## Purpose
Backs the Add/Edit Family tool (`src/app/(web)/tools/addeditfamily/`): contact search, household load, lookup lists, envelope numbering, and the multi-step household save (addresses → household → contacts → participants → donors).

## Files
- `src/services/familyService.ts` — singleton (801 lines)
- `src/services/familyService.test.ts` — 1015 lines
- `src/lib/dto/family.ts` — `HouseholdSchema` (Zod) + `Household`, `FamilyMember`, `FamilyLookups`, `FamilyDefaults`, `SaveProgress`, `SavedMemberId`, `ContactSearchResult` — see `../dto-constants/dtos.md`

## Singleton
```typescript
// src/services/familyService.ts:95-106
public static async getInstance(): Promise<FamilyService> {
  if (!FamilyService.instance) {
    FamilyService.instance = new FamilyService();
    FamilyService.instance.mp = new MPHelper();   // no separate initialize()
  }
  return FamilyService.instance;
}
```

## API

| Method | Returns | Gate `table` / `operation` | Notes |
|--------|---------|----------------------------|-------|
| `searchContacts(term)` | `ContactSearchResult[]` (≤25) | `Contacts` / `read` | `[]` for trimmed term < 2 chars; `escapeFilterString`; `Display_Name LIKE '{escaped}%' AND Contact_Status_ID = 1`; detail = email, else household `Address_Line_1` |
| `resolveContactIdFromPage(tableName, primaryKey, recordId, contactIdField)` | `number \| null` | `{tableName}` / `read` | Validates all four args **before** the gate (`validateColumnName` ×2, `validatePositiveInt`, `validateFkPath`); `select: '{fkPath} AS Resolved_Contact_ID'` |
| `getHousehold(contactId)` | `Household \| null` | `Households` / `read` | Contact → `Household_ID`, then household (+ both addresses via `Address_ID_TABLE` / `Alternate_Mailing_Address_TABLE`) and members in parallel |
| `getLookups()` | `FamilyLookups` | `Contacts` / `read` | 12 lookup tables via `Promise.all`; `states` is the hard-coded `US_STATES` list |
| `getDefaults()` | `FamilyDefaults` | none | Returns a copy of the static `DEFAULT_FAMILY_DEFAULTS`; touches no MP data |
| `getNextEnvelopeNumber()` | `number` | `Contacts` / `read` | `MAX(Envelope_No) + 1` on `Donors` (global — `Donors` has no `Congregation_ID`) |
| `saveHousehold(household)` | `SaveProgress` | `Households` / `update` | Multi-step write; gate's `User_ID` is `$userId` for every write |

## resolveContactIdFromPage
- Callers must pass page metadata resolved server-side from a page ID (`ToolService.getPageData`), never caller-supplied names. Both callers do: the `resolveContactIdFromPage` action and `src/app/(web)/tools/addeditfamily/page.tsx` (via `parseToolParams` → `pageData`).
- An empty `contactIdField` returns `null` after the gate.

## saveHousehold — order of writes

```typescript
// src/services/familyService.ts:474-543 (abridged)
const userId = await AuthorizationService.getInstance().requireSecurityRole({
  table: 'Households',
  operation: 'update',
});
progress.mainAddressId = await wrap(() => this.upsertAddress(household.address, userId));
progress.altAddressId = /* alt address only if addressLine1 present */;
// create or partial-update Households (householdId === 0 → create)
for (const member of household.members) {
  // skip blank new members; saveMember → Contacts, Participants, Donors
}
return progress;
```

- `wrap()` turns any failure into `PartialSaveError(progress, underlying)`; `saveFamily` returns `progress` to the client so a retry can reuse IDs already created. **Not transactional.**
- `upsertAddress` — skipped when line 1 and postal code are both blank.
- `saveMember` — new participant gets `Participant_Start_Date = toMpSqlDatetime(new Date())` and back-links `Contacts.Participant_Record`; new donor gets `Setup_Date` the same way, `DONOR_DEFAULTS` (statement frequency/type/method `1`), and back-links `Contacts.Donor_Record`.
- `resolveUniqueEnvelopeNo` — re-checks the requested envelope number against other donors and bumps to `getNextEnvelopeNumber()` on conflict, up to 5 attempts, then throws. Every interpolated ID is `validatePositiveInt`-checked.
- `Date_of_Birth`, `Season_Start`, `Season_End` go through a local `toDatetime()` (appends `T00:00:00` to a date-only string), not `DomainTimezoneService`.

## Consumers

| Caller | File | Method(s) |
|--------|------|-----------|
| `searchContacts` | `src/app/(web)/tools/addeditfamily/actions.ts` | `searchContacts` |
| `fetchFamilyLookups` | same | `getLookups` |
| `fetchFamilyDefaults` | same | `getDefaults` |
| `fetchHousehold` | same | `getHousehold` |
| `resolveContactIdFromPage` | same | `ToolService.getPageData`, then `resolveContactIdFromPage` |
| `fetchNextEnvelopeNumber` | same | `getNextEnvelopeNumber` |
| `saveFamily` | same | `saveHousehold` (after `HouseholdSchema.safeParse`) |
| `AddEditFamilyPage` | `src/app/(web)/tools/addeditfamily/page.tsx` | `resolveContactIdFromPage` |

Every action calls `requireAccess()` (→ `requireSecurityRole`) first. The same actions file also calls `GooglePlacesService` (`placesEnabled`, `placeAutocomplete`, `placeDetails`); those actions gate `Addresses`/`read`, and the service gates again on `dp_Configuration_Settings`/`read`.

## Related docs
- `query-patterns.md` — validation, escaping, `$userId`
- `tool-service.md` — `getPageData`, sibling `resolveContactIds`
- `../dto-constants/dtos.md` — family DTOs
- `../security/README.md` — authorization gate

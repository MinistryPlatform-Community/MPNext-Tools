---
title: getAddressForContact does not validate contactId
severity: medium
tags: [security, bug]
area: services
files: [src/services/addressLabelService.ts]
discovered: 2026-04-17
discovered_by: services
status: open
---

## Problem
`AddressLabelService.getAddressForContact(contactId: number)` interpolates `contactId` directly into a filter string without validation, unlike its sibling `getAddressesForContacts` which runs `batch.forEach(validatePositiveInt)` before building the `IN` clause. If a caller passes non-numeric-looking input (e.g., from TypeScript `any`/`unknown` casts at a server-action boundary), the filter could break — and at worst leak arbitrary filter fragments into the query.

## Evidence
- `src/services/addressLabelService.ts:95-104` — filter built as `` `Contact_ID = ${contactId}` `` with no `validatePositiveInt(contactId)`
- Compare `src/services/addressLabelService.ts:76` (batched path) — calls `batch.forEach(validatePositiveInt)` before building `Contact_ID IN (...)`

## Proposed fix
Add validation at the top of `getAddressForContact`:

```typescript
async getAddressForContact(contactId: number): Promise<ContactAddressRow | null> {
  validatePositiveInt(contactId);
  const rows = await this.mp!.getTableRecords<ContactAddressRow>({
    table: 'Contacts',
    select: SELECT_FIELDS,
    filter: `Contact_ID = ${contactId}`,
    top: 1,
  });
  return rows[0] ?? null;
}
```

Also add a unit test in `src/services/addressLabelService.test.ts` asserting that a non-positive or non-integer contactId throws before calling `getTableRecords`.

## Impact if not fixed
TypeScript prevents the most obvious misuse, but `any` casts at the action boundary (e.g., `parseInt()` returning `NaN`) can sneak invalid values in. `NaN` rendered into the template becomes `Contact_ID = NaN` — which MP will likely reject, but failure mode is a 500 rather than a clean 400. Matching the batched method's validation closes the gap at trivial cost.

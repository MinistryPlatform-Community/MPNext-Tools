---
title: MP query patterns for services
domain: services
type: reference
applies_to: [src/services/toolService.ts, src/services/userService.ts, src/services/addressLabelService.ts, src/services/groupService.ts, src/services/fieldManagementService.ts, src/services/familyService.ts, src/services/authorizationService.ts, src/lib/validation.ts, src/lib/constants.ts]
symbols: [validateGuid, validatePositiveInt, validateColumnName, validateFkPath, escapeFilterString, MP_FETCH_BATCH_SIZE]
related: [../mp-provider/architecture.md, ../mp-schema/required-procs.md, tool-service.md, user-service.md, address-label-service.md, group-service.md]
last_verified: 2026-10-10
---

## Purpose
Conventions for building safe MP REST queries inside service methods — FK traversal via `_TABLE`, ambiguous-column prefixing, quote escaping, `$userId` audit, and batching.

## Files
- `src/lib/validation.ts` — `validateGuid`, `validatePositiveInt`, `validateColumnName`, `validateFkPath`, `escapeFilterString` (also `validateMailerId`, not a filter guard)
- `src/lib/constants.ts` — `MP_FETCH_BATCH_SIZE` (100)
- `src/services/*.ts` — all call sites follow these rules

## Key concepts
- **Implicit joins.** MP's REST API auto-joins tables named via `_TABLE` in `$select`. If a column appears in more than one joined table, the API returns an **ambiguous column** error.
- **`_TABLE` FK traversal.** Suffix an FK column with `_TABLE` then dot-access a field on the target table. Chain `_TABLE_` between levels; use the dot **only** before the final field.
- **Quote-escape all user input.** `'` → `''` via `escapeFilterString()` (also `[` → `[[]`, `%` → `[%]`, `_` → `[_]` for LIKE; quote look-alikes → `_`).
- **Typed ID validators.** `validateGuid`, `validatePositiveInt`, `validateColumnName`, `validateFkPath` throw before a value reaches any filter/select string. Errors name the field, never the value (CLAUDE.md rule 14).
- **`$userId` audit.** Passing `$userId` to `createTableRecords` / `updateTableRecords` / `executeProcedureWithBody` stamps the MP audit log with that MP `User_ID`. Its only source is `AuthorizationService.requireSecurityRole()`'s return value, taken inside the service (CLAUDE.md rule 13).

## FK traversal

| Pattern | Meaning | Example |
|---------|---------|---------|
| `ColumnName` | Column on the queried table (unambiguous) | `Display_Name` |
| `TableName.ColumnName` | Disambiguate a column that appears in multiple joined tables | `Contacts.Contact_ID` |
| `FKColumn_TABLE.ColumnName` | Follow one FK → pull a column from the related table | `Contact_ID_TABLE.First_Name` |
| `FK1_TABLE_FK2_TABLE.ColumnName` | Multi-level FK traversal (underscores between levels, dot only before final field) | `Household_ID_TABLE_Address_ID_TABLE.City` |
| `FKColumn_TABLE.Column AS Alias` | FK traversal with alias | `Parent_Group_TABLE.Group_Name AS Parent_Group_Name` |
| `[Column/With-Special]` | Bracket notation for columns with `/`, `-`, space | `Household_ID_TABLE_Address_ID_TABLE.[State/Region]` |

**Invalid:** `Building_ID_TABLE.Location_ID_TABLE.Column` (dots between intermediate FK levels). Use underscores: `Building_ID_TABLE_Location_ID_TABLE.Column`.

## Ambiguous column quick reference

| Column | Appears in | Resolution |
|--------|-----------|------------|
| `Contact_ID` | Contacts, dp_Users, Participants, Group_Participants, Household_Care_Log, many more | Prefix with table, e.g., `Contacts.Contact_ID` |
| `User_ID` | dp_Users, dp_User_Roles | Prefix when joining, e.g., `dp_Users.User_ID` |
| `Household_ID` | Contacts, Households | Prefix, e.g., `Contacts.Household_ID` |
| `Display_Name` | Contacts, Groups, Ministries, etc. | Prefix when joining creates shadow |

## Real examples from services

### 1-level FK traversal — `UserService.getUserProfile`
```typescript
// src/services/userService.ts — UserService.getUserProfile
const records = await this.mp!.getTableRecords<MPUserProfile>({
  table: "dp_Users",
  filter: `User_GUID = '${validateGuid(id)}'`,
  select: "Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address",
  top: 1
});
```

### Multi-level FK traversal — `AddressLabelService`
```typescript
// src/services/addressLabelService.ts:24-39
const SELECT_FIELDS = [
  'Contact_ID',
  'Display_Name',
  'First_Name',
  'Last_Name',
  'Contacts.Household_ID',                                       // prefix: disambiguates from Households.Household_ID
  'Household_ID_TABLE.Household_Name',
  'Household_ID_TABLE.Bulk_Mail_Opt_Out',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_1',          // Contacts → Households → Addresses
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_2',
  'Household_ID_TABLE_Address_ID_TABLE.City',
  'Household_ID_TABLE_Address_ID_TABLE.[State/Region]',          // bracket notation for `/`
  'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Bar_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Delivery_Point_Code',
].join(', ');
```

### FK traversal in `$select` (role names) — `AuthorizationService`
```typescript
// src/services/authorizationService.ts — loadSecurityRoles
const records = await mp.getTableRecords<{ Role_Name: string }>({
  table: "dp_User_Roles",
  select: "Role_ID_TABLE.Role_Name",
  filter: `User_ID = ${userId}`,
});
```

## Quote escaping (SQL-injection prevention)

```typescript
// src/lib/validation.ts:127-144 (abridged)
export function escapeFilterString(value: string): string {
  // throws on non-string, length > MAX_SEARCH_TERM_LENGTH (100), or ASCII control chars
  return value
    .replace(/\[/g, '[[]')      // FIRST — `[` opens a LIKE character class
    .replace(/%/g, '[%]')       // escape LIKE wildcard
    .replace(/_/g, '[_]')       // escape LIKE any-single-char wildcard
    .replace(/'/g, "''")        // escape single quotes (SQL-literal escape)
    .replace(QUOTE_LOOKALIKES, '_'); // curly/fullwidth quotes → single-char wildcard
}
```

Used where?

```typescript
// src/services/groupService.ts:241-255 (gate call omitted)
async searchContacts(term: string): Promise<ContactSearchResult[]> {
  const escaped = escapeFilterString(term);
  return this.mp!.getTableRecords<ContactSearchResult>({
    table: 'Contacts',
    select: 'Contact_ID, Display_Name, Email_Address',
    filter: `Display_Name LIKE '${escaped}%'`,
    orderBy: 'Display_Name',
    top: 20,
  });
}
```

Contains-match: `ToolService.listRoles`
```typescript
// src/services/toolService.ts:252-255
const filter = term
  ? `Role_Name LIKE '%${escapeFilterString(term)}%'`
  : undefined;
```

Also used by `FamilyService.searchContacts` (`src/services/familyService.ts:116`).

## Typed validators — fail fast before building a filter

```typescript
// src/lib/validation.ts
export function validateGuid(value: string): string { /* /^[0-9a-f]{8}-.../i throws on fail */ }
export function validatePositiveInt(value: number, field?: string): number { /* throws on non-number, 0, negative, non-safe-integer */ }
export function validateColumnName(value: string): string { /* throws if ≠ /^[A-Za-z_][A-Za-z0-9_]*$/ */ }
export function validateFkPath(value: unknown, field = 'column path'): string { /* `X_TABLE.Col` / `A_TABLE_B_TABLE.Col`; ≤4 FK segments, ≤256 chars; no spaces, commas, AS */ }
```

| Where | Call | Purpose |
|-------|------|---------|
| `userService.ts` (`getUserProfile`), `authorizationService.ts` (`resolveUserId`) | `validateGuid(...)` | Guard `User_GUID = '...'` filter |
| `toolService.ts:335-371` | `validateColumnName`, `validateFkPath`, `validatePositiveInt` | Guard `resolveContactIds` — rejects bad page-metadata table/PK/contact-id-field and record-ID values |
| `familyService.ts:167-174` | `validateColumnName`, `validateFkPath`, `validatePositiveInt` | Guard `resolveContactIdFromPage` (same page-metadata shape) |
| `addressLabelService.ts:83`, `:107` | `validatePositiveInt` | Guard batched `Contact_ID IN (...)` and single `Contact_ID = ${id}` |
| `groupService.ts:289`, `:390` | `validatePositiveInt(groupId)` | Guard `Groups.Group_ID = ${id}` in `getGroup`; `Group_ID` in `updateGroup` |

## `$userId` for MP audit trail

`createTableRecords` / `updateTableRecords` (and `executeProcedureWithBody` via its third `queryParams` argument) accept a `$userId` option — MP records it as the audit user. It must be the numeric MP `User_ID` (not `User_GUID`, not `session.user.id`), and it comes **only** from the gate's return value inside the service — never a method parameter, never an action payload.

```typescript
// src/services/groupService.ts:365-379
async createGroup(data: GroupWizardFormData) {
  // Gate FIRST; its return value is the ONLY source of write attribution.
  const $userId = await AuthorizationService.getInstance().requireSecurityRole({
    table: 'Groups',
    operation: 'create',
  });
  const apiData = await prepareForApi(data);
  const result = await this.mp!.createTableRecords('Groups', [apiData], {
    $select: 'Group_ID, Group_Name',
    $userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}
```

Same pattern: `GroupService.updateGroup`, `FamilyService.saveHousehold` (one gate; `userId` threaded through every address/household/contact/participant/donor write), `FieldManagementService.updatePageFieldOrder` and `ToolService.deployTool` (SP calls with `{ $userId }`). `User_GUID` → `User_ID` resolution lives in `resolveUserId` inside `src/services/authorizationService.ts`.

## Batching guards

Guard empty arrays, batch large IN-lists to ≤100 IDs per request:

```typescript
// src/services/addressLabelService.ts:70-97 (gate call omitted)
// MP_FETCH_BATCH_SIZE = 100 — src/lib/constants.ts
async getAddressesForContacts(contactIds: number[]): Promise<ContactAddressRow[]> {
  if (contactIds.length === 0) return [];

  const results: ContactAddressRow[] = [];

  for (let i = 0; i < contactIds.length; i += MP_FETCH_BATCH_SIZE) {
    const batch = contactIds.slice(i, i + MP_FETCH_BATCH_SIZE);
    batch.forEach((id) => validatePositiveInt(id));
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

`ToolService.resolveContactIds` uses the same `MP_FETCH_BATCH_SIZE` loop at `src/services/toolService.ts:369-384`.

## Filtering quick reference

```typescript
// Numeric exact match — no quotes
filter: 'Group_ID = 123'

// String exact match — single quotes around value
filter: "User_GUID = 'abc-def-ghi'"

// LIKE
filter: "Display_Name LIKE 'Smith%'"

// NULL
filter: 'End_Date IS NULL'

// IN
filter: 'Group_Focus_ID IN (6, 7, 24)'

// AND / OR
filter: "Group_ID = 5 AND Group_Role_ID = 7 AND End_Date IS NULL"
```

## Special column names

| Column | Table | Issue | Access pattern |
|--------|-------|-------|----------------|
| `State/Region` | Addresses | `/` | Bracket: `[State/Region]` in select; `'State/Region'` as TS key |
| `Allow_Check-in` | Events | `-` | Bracket in select; `obj["Allow_Check-in"]` in TS |
| `Secure_Check-in` | Groups | `-` | `r['Secure_Check-in']` in TS (see `groupService.ts:327`) |

## MPHelper parameter mapping

`getTableRecords()` uses friendly names; `createTableRecords`/`updateTableRecords` accept raw `$`-prefixed params.

| Friendly (`getTableRecords`) | API (`createTableRecords` / `updateTableRecords`) |
|------------------------------|--------------------------------------------------|
| `table` | URL `/tables/{table}` |
| `select` | `$select` |
| `filter` | `$filter` |
| `orderBy` | `$orderby` |
| `groupBy` | `$groupby` |
| `having` | `$having` |
| `top` | `$top` |
| `skip` | `$skip` |
| `distinct` | `$distinct` |
| `userId` | `$userId` |
| `globalFilterId` | `$globalFilterId` |

## Gotchas
- Forgetting to prefix an ambiguous column in `$select` or `$filter` → MP returns "Ambiguous column name" 500. Rule of thumb: any time you use `_TABLE` traversal AND the base table shares a column name with the related table, prefix the base-table column.
- Using dots between FK levels (`Building_ID_TABLE.Location_ID_TABLE.Column`) — invalid; use `_TABLE_` underscores.
- Taking `$userId` from anywhere but `requireSecurityRole()`'s return value (a method parameter, the action payload, `session.user.id`) — `session.user.id` is a Better Auth internal ID, not the MP `User_ID`, and a caller-supplied value is forgeable.
- Building a filter from unescaped user input → risk of broken queries and injection. Always `escapeFilterString()` for strings, a typed validator for IDs/column names.

## Related docs
- `../mp-provider/architecture.md` — `MPHelper` facade (what services call)
- `../mp-schema/required-procs.md` — stored procs called from services
- `../auth/sessions.md` — `userGuid` vs `user.id`
- `tool-service.md`, `user-service.md`, `address-label-service.md`, `group-service.md`, `field-management-service.md`, `family-service.md`
- `../security/README.md` — authorization gate and write attribution

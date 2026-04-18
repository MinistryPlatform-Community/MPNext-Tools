---
title: MP query patterns for services
domain: services
type: reference
applies_to: [src/services/toolService.ts, src/services/userService.ts, src/services/addressLabelService.ts, src/services/groupService.ts, src/services/fieldManagementService.ts, src/lib/validation.ts]
symbols: [validateGuid, validatePositiveInt, validateColumnName, escapeFilterString]
related: [../mp-provider/helper.md, ../mp-schema/required-procs.md, tool-service.md, user-service.md, address-label-service.md, group-service.md]
last_verified: 2026-04-17
---

## Purpose
Conventions for building safe MP REST queries inside service methods — FK traversal via `_TABLE`, ambiguous-column prefixing, quote escaping, `$userId` audit, and batching.

## Files
- `src/lib/validation.ts` — `validateGuid`, `validatePositiveInt`, `validateColumnName`, `escapeFilterString`
- `src/services/*.ts` — all call sites follow these rules

## Key concepts
- **Implicit joins.** MP's REST API auto-joins tables named via `_TABLE` in `$select`. If a column appears in more than one joined table, the API returns an **ambiguous column** error.
- **`_TABLE` FK traversal.** Suffix an FK column with `_TABLE` then dot-access a field on the target table. Chain `_TABLE_` between levels; use the dot **only** before the final field.
- **Quote-escape all user input.** `'` → `''` via `escapeFilterString()` (also `%` → `[%]`, `_` → `[_]` for LIKE).
- **Typed ID validators.** `validateGuid`, `validatePositiveInt`, `validateColumnName` throw before a value reaches any filter string.
- **`$userId` audit.** Passing `$userId` to `createTableRecords` / `updateTableRecords` stamps MP audit columns with that MP User ID (not the Better Auth session user ID).

## FK traversal

| Pattern | Meaning | Example |
|---------|---------|---------|
| `ColumnName` | Column on the queried table (unambiguous) | `Display_Name` |
| `TableName.ColumnName` | Disambiguate a column that appears in multiple joined tables | `Contacts.Contact_ID` |
| `FKColumn_TABLE.ColumnName` | Follow one FK → pull a column from the related table | `Contact_ID_TABLE.First_Name` |
| `FK1_TABLE_FK2_TABLE.ColumnName` | Multi-level FK traversal (underscores between levels, dot only before final field) | `Household_ID_TABLE_Address_ID_TABLE.City` |
| `FKColumn_TABLE.Column AS Alias` | FK traversal with alias | `Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID` |
| `[Column/With-Special]` | Bracket notation for columns with `/`, `-`, space | `Household_ID_TABLE_Address_ID_TABLE.[State/Region]` |

**Invalid:** `Building_ID_TABLE.Location_ID_TABLE.Column` (dots between intermediate FK levels). Use underscores: `Building_ID_TABLE_Location_ID_TABLE.Column`.

## Ambiguous column quick reference

| Column | Appears in | Resolution |
|--------|-----------|------------|
| `Contact_ID` | Contacts, dp_Users, Participants, Group_Participants, Household_Care_Log, many more | Prefix with table, e.g., `Contacts.Contact_ID` |
| `User_ID` | dp_Users, dp_User_Roles, dp_User_User_Groups | Prefix when joining, e.g., `dp_Users.User_ID` |
| `Household_ID` | Contacts, Households | Prefix, e.g., `Contacts.Household_ID` |
| `Display_Name` | Contacts, Groups, Ministries, etc. | Prefix when joining creates shadow |

## Real examples from services

### 1-level FK traversal — `UserService.getUserProfile`
```typescript
// src/services/userService.ts:81-87
const records = await this.mp!.getTableRecords<MPUserProfile>({
  table: "dp_Users",
  filter: `User_GUID = '${validateGuid(id)}'`,
  select: "User_ID, User_GUID, Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address,Contact_ID_TABLE.Mobile_Phone,Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID",
  top: 1
});
```

### Multi-level FK traversal — `AddressLabelService`
```typescript
// src/services/addressLabelService.ts:23-38
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

### FK traversal in `$select` (role names) — `UserService`
```typescript
// src/services/userService.ts:93-102
this.mp!.getTableRecords<{ Role_Name: string }>({
  table: "dp_User_Roles",
  filter: `User_ID = ${profile.User_ID}`,
  select: "Role_ID_TABLE.Role_Name",
}),
this.mp!.getTableRecords<{ User_Group_Name: string }>({
  table: "dp_User_User_Groups",
  filter: `User_ID = ${profile.User_ID}`,
  select: "User_Group_ID_TABLE.User_Group_Name",
}),
```

## Quote escaping (SQL-injection prevention)

```typescript
// src/lib/validation.ts
export function escapeFilterString(value: string): string {
  return value
    .replace(/'/g, "''")        // escape single quotes (SQL-literal escape)
    .replace(/%/g, '[%]')       // escape LIKE wildcard
    .replace(/_/g, '[_]');      // escape LIKE any-single-char wildcard
}
```

Used where?

```typescript
// src/services/groupService.ts:151-170
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

Inline escape (no `%`/`_` wildcards): `ToolService.listRoles`
```typescript
// src/services/toolService.ts:226-239
const filter = term
  ? `Role_Name LIKE '%${term.replace(/'/g, "''")}%'`
  : undefined;
```

## Typed validators — fail fast before building a filter

```typescript
// src/lib/validation.ts
export function validateGuid(value: string): string { /* /^[0-9a-f]{8}-.../ throws on fail */ }
export function validatePositiveInt(value: number): number { /* throws on 0, negative, non-int */ }
export function validateColumnName(value: string): string { /* throws if ≠ /^[A-Za-z_][A-Za-z0-9_]*$/ */ }
```

| Where | Call | Purpose |
|-------|------|---------|
| `userService.ts:72, 84` | `validateGuid(guid)` | Guard `User_GUID = '...'` filter |
| `toolService.ts:307-334` | `validateColumnName`, `validatePositiveInt` | Guard `resolveContactIds` — rejects bad table/PK/contact-id-field/record-ID values |
| `addressLabelService.ts:76` | `batch.forEach(validatePositiveInt)` | Guard batched `Contact_ID IN (...)` |
| `groupService.ts:176` | `validatePositiveInt(groupId)` | Guard `Group_ID = ${id}` in `getGroup` |

## `$userId` for MP audit trail

`createTableRecords` / `updateTableRecords` accept a `$userId` option — MP records it as the audit user for the created/updated row. Pass the numeric MP `User_ID` (not `User_GUID`, not `session.user.id`).

```typescript
// src/services/groupService.ts:227-237
async createGroup(data, userId) {
  const apiData = prepareForApi(data);
  const result = await this.mp!.createTableRecords('Groups', [apiData], {
    $select: 'Group_ID, Group_Name',
    $userId: userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}

// src/services/groupService.ts:239-251
async updateGroup(groupId, data, userId) {
  const apiData = { Group_ID: groupId, ...prepareForApi(data as GroupWizardFormData) };
  const result = await this.mp!.updateTableRecords('Groups', [apiData], {
    partial: true,
    $select: 'Group_ID, Group_Name',
    $userId: userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}
```

To resolve the numeric MP User ID from the session's `User_GUID`, call `UserService.getUserIdByGuid(userGuid)`.

## Batching guards

Guard empty arrays, batch large IN-lists to ≤100 IDs per request:

```typescript
// src/services/addressLabelService.ts:21, 69-89
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

`ToolService.resolveContactIds` uses the same pattern with `BATCH_SIZE = 100` at `src/services/toolService.ts:283, 332-339`.

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
| `Secure_Check-in` | Groups | `-` | `r['Secure_Check-in']` in TS (see `groupService.ts:214`) |

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
- Passing Better Auth `session.user.id` as `$userId` — it's a Better Auth internal ID, not the MP `User_ID`. Resolve via `UserService.getUserIdByGuid(session.user.userGuid)` first.
- Building a filter from unescaped user input → risk of broken queries and injection. Always `escapeFilterString()` or `term.replace(/'/g, "''")`.

## Related docs
- `../mp-provider/helper.md` — `MPHelper` facade (what services call)
- `../mp-schema/required-procs.md` — stored procs called from services
- `../auth/sessions.md` — `userGuid` vs `user.id`
- `tool-service.md`, `user-service.md`, `address-label-service.md`, `group-service.md`, `field-management-service.md`

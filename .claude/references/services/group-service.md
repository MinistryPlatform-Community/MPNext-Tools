---
title: GroupService
domain: services
type: reference
applies_to: [src/services/groupService.ts, src/services/groupService.test.ts]
symbols: [GroupService]
related: [query-patterns.md, ../components/group-wizard.md]
last_verified: 2026-04-17
---

## Purpose
Backs the group-wizard feature: parallel lookup-table fetch, contact/group search, and group create/update with date-string coercion and `$userId` audit.

## Files
- `src/services/groupService.ts` — 253 lines
- `src/services/groupService.test.ts` — 401 lines

## Singleton
```typescript
// src/services/groupService.ts:27-45
export class GroupService {
  private static instance: GroupService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<GroupService> { ... }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## API

| Method | Returns | Notes |
|--------|---------|-------|
| `fetchAllLookups()` | `GroupWizardLookups` | 13 lookup tables via `Promise.all` |
| `searchContacts(term)` | `ContactSearchResult[]` (≤20) | `escapeFilterString()`, `Display_Name LIKE '{escaped}%'` |
| `searchGroups(term)` | `GroupSearchResult[]` (≤20) | `escapeFilterString()`, `Group_Name LIKE '{escaped}%' AND End_Date IS NULL`, FK-traverses `Group_Type` |
| `getGroup(groupId)` | `GroupWizardFormData \| null` | `validatePositiveInt(groupId)`, strips time from ISO dates |
| `createGroup(data, userId)` | `{ Group_ID, Group_Name }` | `prepareForApi()` coerces date strings, passes `$userId` |
| `updateGroup(groupId, data, userId)` | `{ Group_ID, Group_Name }` | `partial: true`, `$userId` |

## fetchAllLookups — 13 parallel queries

```typescript
// src/services/groupService.ts:47-149 (abridged — 13 entries)
const [groupTypes, ministries, congregations, meetingDays, ...] = await Promise.all([
  this.mp!.getTableRecords({ table: 'Group_Types',  select: 'Group_Type_ID, Group_Type', orderBy: 'Group_Type' }),
  this.mp!.getTableRecords({ table: 'Ministries',   select: 'Ministry_ID, Ministry_Name', filter: 'End_Date IS NULL', orderBy: 'Ministry_Name' }),
  this.mp!.getTableRecords({ table: 'Congregations',select: 'Congregation_ID, Congregation_Name', filter: 'End_Date IS NULL', orderBy: 'Congregation_Name' }),
  this.mp!.getTableRecords({ table: 'Meeting_Days', select: 'Meeting_Day_ID, Meeting_Day', orderBy: 'Meeting_Day_ID' }),
  this.mp!.getTableRecords({ table: 'Meeting_Frequencies', select: 'Meeting_Frequency_ID, Meeting_Frequency', orderBy: 'Meeting_Frequency_ID' }),
  this.mp!.getTableRecords({ table: 'Meeting_Durations',   select: 'Meeting_Duration_ID, Meeting_Duration', orderBy: 'Meeting_Duration_ID' }),
  this.mp!.getTableRecords({ table: 'Life_Stages', select: 'Life_Stage_ID, Life_Stage', orderBy: 'Life_Stage' }),
  this.mp!.getTableRecords({ table: 'Group_Focuses', select: 'Group_Focus_ID, Group_Focus', orderBy: 'Group_Focus' }),
  this.mp!.getTableRecords({ table: 'Priorities',   select: 'Priority_ID, Priority_Name', orderBy: 'Priority_Name' }),
  this.mp!.getTableRecords({ table: 'Rooms',        select: 'Room_ID, Room_Name', filter: 'Bookable = 1', orderBy: 'Room_Name' }),
  this.mp!.getTableRecords({ table: 'Books',        select: 'Book_ID, Title', orderBy: 'Title' }),
  this.mp!.getTableRecords({ table: 'dp_SMS_Numbers', select: 'SMS_Number_ID, Number_Title', filter: 'Active = 1', orderBy: 'Number_Title' }),
  this.mp!.getTableRecords({ table: 'Group_Ended_Reasons', select: 'Group_Ended_Reason_ID, Group_Ended_Reason', orderBy: 'Group_Ended_Reason' }),
]);
```

Each result is mapped to `{ id: number, name: string }[]`.

Active-only filters applied on `Ministries`, `Congregations`, `Rooms` (`Bookable = 1`), `dp_SMS_Numbers` (`Active = 1`).

## searchContacts / searchGroups

```typescript
// src/services/groupService.ts:151-171
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

async searchGroups(term: string): Promise<GroupSearchResult[]> {
  const escaped = escapeFilterString(term);
  return this.mp!.getTableRecords<GroupSearchResult>({
    table: 'Groups',
    select: 'Group_ID, Group_Name, Group_Type_ID_TABLE.Group_Type',
    filter: `Group_Name LIKE '${escaped}%' AND End_Date IS NULL`,
    orderBy: 'Group_Name',
    top: 20,
  });
}
```

- `escapeFilterString()` from `src/lib/validation.ts` — escapes `'`, `%`, `_`
- `searchGroups` FK-traverses `Group_Type_ID_TABLE.Group_Type` to inline the type name

## getGroup — date coercion on read

```typescript
// src/services/groupService.ts:173-225 (abridged)
async getGroup(groupId: number): Promise<GroupWizardFormData | null> {
  const records = await this.mp!.getTableRecords<Record<string, unknown>>({
    table: 'Groups',
    filter: `Group_ID = ${validatePositiveInt(groupId)}`,
    top: 1,
  });
  if (!records || records.length === 0) return null;

  const r = records[0];
  return {
    Group_Name: r.Group_Name as string,
    // ...48+ fields mapped
    Start_Date: r.Start_Date ? (r.Start_Date as string).split('T')[0] : '',
    End_Date:   r.End_Date   ? (r.End_Date   as string).split('T')[0] : null,
    Promotion_Date: r.Promotion_Date ? (r.Promotion_Date as string).split('T')[0] : null,
    'Secure_Check-in': (r['Secure_Check-in'] as boolean) ?? false,
    // ...
  };
}
```

- MP returns ISO datetimes; form expects `YYYY-MM-DD`. `split('T')[0]` strips the time.
- `Secure_Check-in` uses bracket access — hyphen in the column name.

## createGroup / updateGroup — date coercion on write

```typescript
// src/services/groupService.ts:10-25
function toDatetime(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes('T')) return value;
  return `${value}T00:00:00Z`;
}

function prepareForApi(data: GroupWizardFormData): Record<string, unknown> {
  return {
    ...data,
    Start_Date:     toDatetime(data.Start_Date),
    End_Date:       toDatetime(data.End_Date),
    Promotion_Date: toDatetime(data.Promotion_Date),
  };
}
```

```typescript
// src/services/groupService.ts:227-251
async createGroup(data, userId) {
  const apiData = prepareForApi(data);
  const result = await this.mp!.createTableRecords('Groups', [apiData], {
    $select: 'Group_ID, Group_Name',
    $userId: userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}

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

- `$userId` — numeric MP User ID for audit. Resolve from session via `UserService.getUserIdByGuid(session.user.userGuid)`.
- `partial: true` on update — omitted fields are left untouched.
- `$select` limits returned columns to `Group_ID, Group_Name`.

## Consumers

| Action | File |
|--------|------|
| `fetchGroupWizardLookups` | `src/components/group-wizard/actions.ts` |
| `searchContacts` / `searchGroups` | `src/components/group-wizard/actions.ts` |
| `fetchGroupRecord` | `src/components/group-wizard/actions.ts` |
| `createGroup` / `updateGroup` | `src/components/group-wizard/actions.ts` |

## Gotchas
- `searchContacts(term)` assumes `term.length >= 2` — the action validates that; if a service caller forgets, an empty prefix query returns everything up to `top: 20`.
- `getGroup` returns `null` on "not found"; `createGroup`/`updateGroup` do not — they throw on API error.
- All three lookup active-filters (`End_Date IS NULL` for Ministries/Congregations, `Bookable = 1` for Rooms, `Active = 1` for SMS) must stay — UI relies on active-only lists.
- Passing `userId = session.user.id` instead of the MP User_ID produces corrupt audit rows. Always resolve via `UserService.getUserIdByGuid()`.

## Related docs
- `query-patterns.md` — validation, escaping, FK traversal, `$userId`
- `../components/group-wizard.md` — consuming UI and schema
- `user-service.md` — `getUserIdByGuid` for `$userId` resolution

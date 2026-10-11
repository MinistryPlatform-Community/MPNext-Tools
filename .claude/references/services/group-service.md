---
title: GroupService
domain: services
type: reference
applies_to: [src/services/groupService.ts, src/services/groupService.test.ts]
symbols: [GroupService, GROUP_WRITABLE_FIELDS, GetGroupResult, GroupWizardDisplayNames]
related: [query-patterns.md, ../components/group-wizard.md, ../ministryplatform.datetimehandling.md]
last_verified: 2026-10-10
---

## Purpose
Backs the group-wizard feature: parallel lookup-table fetch, contact/group search, group read (with display names for FK fields), and group create/update through a column allowlist, MP-TZ date conversion and gate-sourced `$userId` audit.

## Files
- `src/services/groupService.ts` — 405 lines
- `src/services/groupService.test.ts` — 581 lines

## Singleton
```typescript
// src/services/groupService.ts:113-131
export class GroupService {
  private static instance: GroupService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<GroupService> { ... }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## Authorization
Every method calls `AuthorizationService.getInstance().requireSecurityRole(...)` first (see `../security/README.md`). Writes use its return value as `$userId` — callers never pass a user ID.

| Method | Gate `table` / `operation` |
|--------|---------------------------|
| `fetchAllLookups` | `Groups` / `read` |
| `searchContacts` | `Contacts` / `read` |
| `searchGroups` | `Groups` / `read` |
| `getGroup` | `Groups` / `read` |
| `createGroup` | `Groups` / `create` |
| `updateGroup` | `Groups` / `update` |

## API

| Method | Returns | Notes |
|--------|---------|-------|
| `fetchAllLookups()` | `GroupWizardLookups` | 13 lookup tables via `Promise.all` |
| `searchContacts(term)` | `ContactSearchResult[]` (≤20) | `escapeFilterString()`, `Display_Name LIKE '{escaped}%'` |
| `searchGroups(term)` | `GroupSearchResult[]` (≤20) | `escapeFilterString()`, `Group_Name LIKE '{escaped}%' AND End_Date IS NULL`, FK-traverses `Group_Type` |
| `getGroup(groupId)` | `GetGroupResult \| null` (`{ data, displayNames }`) | `validatePositiveInt(groupId)`, FK display-name joins, strips time from ISO dates |
| `createGroup(data)` | `{ Group_ID, Group_Name }` | `prepareForApi()` allowlist + date conversion; `$userId` from gate |
| `updateGroup(groupId, data)` | `{ Group_ID, Group_Name }` | `validatePositiveInt(groupId)`, `partial: true`, `Group_ID` written last; `$userId` from gate |

## fetchAllLookups — 13 parallel queries

```typescript
// src/services/groupService.ts:133-239 (abridged — 13 entries)
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
// src/services/groupService.ts:241-270 (gate calls omitted)
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

- `escapeFilterString()` from `src/lib/validation.ts` — bracket-escapes `[`, `%`, `_`, doubles `'`; throws on >100 chars or control characters
- `searchGroups` FK-traverses `Group_Type_ID_TABLE.Group_Type` to inline the type name

## getGroup — display names + date strip on read

```typescript
// src/services/groupService.ts:272-363 (abridged)
const records = await this.mp!.getTableRecords<Record<string, unknown>>({
  table: 'Groups',
  select: [
    'Groups.*',
    'Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name',
    'Parent_Group_TABLE.Group_Name AS Parent_Group_Name',
    'Promote_to_Group_TABLE.Group_Name AS Promote_to_Group_Name',
    'Descended_From_TABLE.Group_Name AS Descended_From_Name',
  ].join(', '),
  filter: `Groups.Group_ID = ${validatePositiveInt(groupId)}`,
  top: 1,
});
if (!records || records.length === 0) return null;
// ...map ~40 fields into GroupWizardFormData, e.g.
//   Start_Date: r.Start_Date ? (r.Start_Date as string).split('T')[0] : '',
//   'Secure_Check-in': (r['Secure_Check-in'] as boolean) ?? false,
return { data, displayNames: { contacts, groups } };
```

- `Groups.*` / `Groups.Group_ID` are prefixed because the FK joins make bare names ambiguous.
- `AS` aliases seed `displayNames.contacts` (`Primary_Contact`) and `displayNames.groups` (`Parent_Group`, `Promote_to_Group`, `Descended_From`) so edit mode needs no second round trip.
- MP returns wall-clock datetimes; the form expects `YYYY-MM-DD`, so `split('T')[0]` strips the time.

## createGroup / updateGroup — allowlist + MP-TZ dates on write

```typescript
// src/services/groupService.ts:88-111
const DATE_FIELDS = ['Start_Date', 'End_Date', 'Promotion_Date'] as const;

async function prepareForApi(data: Partial<GroupWizardFormData>): Promise<Record<string, unknown>> {
  const source = data as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const field of GROUP_WRITABLE_FIELDS) {
    if (Object.hasOwn(source, field)) picked[field] = source[field];
  }
  const tz = DomainTimezoneService.getInstance();
  for (const field of DATE_FIELDS) {
    if (!Object.hasOwn(picked, field)) continue;
    const value = picked[field] as string | null | undefined;
    picked[field] = value ? await tz.toMpSqlDatetime(value) : null;
  }
  return picked;
}
```

- `GROUP_WRITABLE_FIELDS` (`src/services/groupService.ts:40-86`) — frozen allowlist of exactly the columns the wizard edits; equals the union of `STEP_FIELDS` in `src/components/group-wizard/schema.ts` (pinned by a test). Any other key (`Domain_ID`, `_Last_Attendance_Posted`, a smuggled `Group_ID`) is dropped.
- Dates go through `DomainTimezoneService.toMpSqlDatetime` (MP-TZ wall clock) — see `../ministryplatform.datetimehandling.md`.

```typescript
// src/services/groupService.ts:365-404 (abridged)
async createGroup(data: GroupWizardFormData) {
  const $userId = await AuthorizationService.getInstance().requireSecurityRole({ table: 'Groups', operation: 'create' });
  const apiData = await prepareForApi(data);
  const result = await this.mp!.createTableRecords('Groups', [apiData], {
    $select: 'Group_ID, Group_Name',
    $userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}

async updateGroup(groupId: number, data: Partial<GroupWizardFormData>) {
  const $userId = await AuthorizationService.getInstance().requireSecurityRole({ table: 'Groups', operation: 'update' });
  validatePositiveInt(groupId);
  const apiData = { ...(await prepareForApi(data)), Group_ID: groupId };
  const result = await this.mp!.updateTableRecords('Groups', [apiData], {
    partial: true,
    $select: 'Group_ID, Group_Name',
    $userId,
  });
  return result[0] as unknown as { Group_ID: number; Group_Name: string };
}
```

- `$userId` — numeric MP `User_ID` returned by the gate; the only source of write attribution (CLAUDE.md rule 13).
- `Group_ID` is spread **last** from the validated argument, so nothing in the payload can retarget the update.
- `partial: true` on update — omitted fields are left untouched.
- `$select` limits returned columns to `Group_ID, Group_Name`.

## Consumers

All in `src/components/group-wizard/actions.ts`; each action calls `requireAccess()` (→ `requireSecurityRole`) first.

| Action | Service method |
|--------|----------------|
| `fetchGroupWizardLookups` | `fetchAllLookups` |
| `searchContacts` / `searchGroups` | `searchContacts` / `searchGroups` (action returns `[]` for terms < 2 chars) |
| `fetchGroupRecord` | `getGroup` |
| `createGroup` / `updateGroup` | `createGroup` / `updateGroup` (action Zod-parses the payload with `groupWizardSchema` first) |

## Gotchas
- `searchContacts(term)` assumes `term.length >= 2` — the action enforces that; if a service caller forgets, an empty prefix query returns everything up to `top: 20`.
- `getGroup` returns `null` on "not found"; `createGroup`/`updateGroup` do not — they throw on API error.
- All lookup active-filters (`End_Date IS NULL` for Ministries/Congregations, `Bookable = 1` for Rooms, `Active = 1` for SMS) must stay — UI relies on active-only lists.
- A new wizard field must go into **both** `STEP_FIELDS` and `GROUP_WRITABLE_FIELDS`; otherwise the allowlist test fails and the field is never written.

## Related docs
- `query-patterns.md` — validation, escaping, FK traversal, `$userId`
- `../components/group-wizard.md` — consuming UI and schema
- `../ministryplatform.datetimehandling.md` — `DomainTimezoneService` conversion rules
- `../security/README.md` — authorization gate and write attribution

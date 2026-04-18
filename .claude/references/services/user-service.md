---
title: UserService
domain: services
type: reference
applies_to: [src/services/userService.ts, src/services/userService.test.ts]
symbols: [UserService, MPUserProfile]
related: [query-patterns.md, ../auth/sessions.md, ../components/shared-actions.md]
last_verified: 2026-04-17
---

## Purpose
Fetches the enriched MP user profile (by `User_GUID`) plus role names and user-group names; also resolves `User_GUID` → numeric `User_ID` for `$userId` audit use.

## Files
- `src/services/userService.ts` — singleton
- `src/services/userService.test.ts` — 160 lines; covers singleton, `getUserProfile` happy/empty/error paths, and `getUserIdByGuid` (including malformed GUID).

## Singleton
```typescript
// src/services/userService.ts:11-45
export class UserService {
  private static instance: UserService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<UserService> { ... }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## API

| Method | Returns | Purpose |
|--------|---------|---------|
| `getUserProfile(id: string)` | `MPUserProfile \| undefined` | Full profile: Contact fields + roles + user groups |
| `getUserIdByGuid(guid: string)` | `number` | MP numeric `User_ID` (for `$userId` audit) |

Both methods guard input via `validateGuid()` from `src/lib/validation.ts`.

## getUserProfile

Three queries: profile first (so the numeric `User_ID` is known), then roles and user-groups in parallel via `Promise.all`.

```typescript
// src/services/userService.ts:81-110
public async getUserProfile(id: string): Promise<MPUserProfile | undefined> {
  const records = await this.mp!.getTableRecords<MPUserProfile>({
    table: "dp_Users",
    filter: `User_GUID = '${validateGuid(id)}'`,
    select: "User_ID, User_GUID, Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address,Contact_ID_TABLE.Mobile_Phone,Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID",
    top: 1
  });

  const profile = records[0];
  if (!profile) return undefined;

  const [roleRecords, groupRecords] = await Promise.all([
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
  ]);

  return {
    ...profile,
    roles: roleRecords.map((r) => r.Role_Name),
    userGroups: groupRecords.map((g) => g.User_Group_Name),
  };
}
```

### Query 1 — `dp_Users`
| Param | Value |
|-------|-------|
| `filter` | `User_GUID = '{validated guid}'` |
| `select` | `User_ID, User_GUID, Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Nickname, Contact_ID_TABLE.Last_Name, Contact_ID_TABLE.Email_Address, Contact_ID_TABLE.Mobile_Phone, Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID` |
| `top` | `1` |

FK traversal: `dp_Users.Contact_ID` → `Contacts` row. `dp_fileUniqueId` aliased to `Image_GUID` for the profile picture.

### Query 2 — `dp_User_Roles` (parallel)
| Param | Value |
|-------|-------|
| `filter` | `User_ID = {profile.User_ID}` |
| `select` | `Role_ID_TABLE.Role_Name` |

Maps to `string[]` of role names.

### Query 3 — `dp_User_User_Groups` (parallel)
| Param | Value |
|-------|-------|
| `filter` | `User_ID = {profile.User_ID}` |
| `select` | `User_Group_ID_TABLE.User_Group_Name` |

Maps to `string[]` of user-group names.

## getUserIdByGuid

```typescript
// src/services/userService.ts:68-79
public async getUserIdByGuid(guid: string): Promise<number> {
  const records = await this.mp!.getTableRecords<{ User_ID: number }>({
    table: 'dp_Users',
    select: 'User_ID',
    filter: `User_GUID = '${validateGuid(guid)}'`,
    top: 1,
  });
  if (!records || records.length === 0) {
    throw new Error('User not found');
  }
  return records[0].User_ID;
}
```

- Throws `Invalid GUID format: ...` for malformed input (via `validateGuid`)
- Throws `User not found` when `dp_Users` returns 0 rows or null

## Return type

```typescript
// MPUserProfile — from src/lib/providers/ministry-platform/types.ts
{
  User_ID: number;
  User_GUID: string;
  Contact_ID: number;
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
  Mobile_Phone: string | null;
  Image_GUID: string | null;
  roles: string[];
  userGroups: string[];
}
```

## Caller contract

> Pass `session.user.userGuid`, **not** `session.user.id`. Better Auth's `user.id` is the internal auth record ID, not the MP `User_GUID`.

```typescript
// src/components/shared-actions/user.ts — correct usage
const profile = await UserService.getInstance().then(s => s.getUserProfile(session.user.userGuid));
```

See `../auth/sessions.md` for `userGuid` vs `user.id`.

## Consumers

| Action | File | Method |
|--------|------|--------|
| `getCurrentUserProfile` | `src/components/shared-actions/user.ts` | `getUserProfile` |
| `getUserTools` | `src/components/dev-panel/panels/user-tools-actions.ts` | `getUserIdByGuid` (then ToolService.getUserTools) |
| Group-wizard actions (create/update) | `src/components/group-wizard/actions.ts` | `getUserIdByGuid` (for `$userId` audit) |
| Address-label actions | `src/components/address-labels/actions.ts` | `getUserIdByGuid` |

## Gotchas
- `getUserProfile` does NOT re-check the session; caller is responsible for `auth.api.getSession()`.
- If `dp_Users` has 0 rows for the GUID, `getUserProfile` returns `undefined` (not throw); `getUserIdByGuid` throws `User not found`.
- The `select` string has no spaces after some commas (`...Nickname,Contact_ID_TABLE...`) — MP REST accepts this; do not "fix" unless the API starts rejecting it.

## Related docs
- `query-patterns.md` — FK traversal + validation rules
- `../auth/sessions.md` — `userGuid` vs `user.id`
- `../components/shared-actions.md` — `getCurrentUserProfile`

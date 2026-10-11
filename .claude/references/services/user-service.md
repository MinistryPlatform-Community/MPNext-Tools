---
title: UserService
domain: services
type: reference
applies_to: [src/services/userService.ts, src/services/userService.test.ts]
symbols: [UserService, MPUserProfile]
related: [query-patterns.md, ../auth/sessions.md, ../components/layout.md]
last_verified: 2026-10-10
---

## Purpose
Fetches the signed-in user's display profile (`MPUserProfile`: names + email) by `User_GUID`. Single `dp_Users` query; no roles, user groups, IDs, phone, or image.

## Files
- `src/services/userService.ts` — singleton
- `src/services/userService.test.ts` — covers singleton, `getUserProfile` single-query select, explicit mapping (extra row fields never pass through), `Email_Address` → `null` normalization, empty result, malformed GUID, error propagation.

## Singleton
```typescript
// src/services/userService.ts — UserService
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
| `getUserProfile(id: string)` | `MPUserProfile \| undefined` | Display profile: `First_Name`, `Nickname`, `Last_Name`, `Email_Address` |

Input guarded via `validateGuid()` from `src/lib/validation.ts`. `User_GUID` → numeric `User_ID` resolution for `$userId` lives in `AuthorizationService` (`resolveUserId` in `src/services/authorizationService.ts`), not here.

## getUserProfile

One query. The row is mapped field-by-field so nothing else MP returns can reach the client.

```typescript
// src/services/userService.ts — UserService.getUserProfile
public async getUserProfile(id: string): Promise<MPUserProfile | undefined> {
  const records = await this.mp!.getTableRecords<MPUserProfile>({
    table: "dp_Users",
    filter: `User_GUID = '${validateGuid(id)}'`,
    select: "Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address",
    top: 1
  });

  const row = records[0];
  if (!row) return undefined;

  return {
    First_Name: row.First_Name,
    Nickname: row.Nickname,
    Last_Name: row.Last_Name,
    Email_Address: row.Email_Address ?? null,
  };
}
```

### Query — `dp_Users`
| Param | Value |
|-------|-------|
| `filter` | `User_GUID = '{validated guid}'` |
| `select` | `Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Nickname, Contact_ID_TABLE.Last_Name, Contact_ID_TABLE.Email_Address` |
| `top` | `1` |

FK traversal: `dp_Users.Contact_ID` → `Contacts` row.

## Return type

```typescript
// src/lib/providers/ministry-platform/types/user-profile.types.ts
export interface MPUserProfile {
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
}
```

Deliberately minimal (client-bound DTO). Formerly also carried `User_ID`, `User_GUID`, `Contact_ID`, `Mobile_Phone`, `Image_GUID`, `roles`, `userGroups` — none rendered. Add a field back only with the UI that needs it.

## Caller contract

> Pass `session.user.userGuid`, **not** `session.user.id`. Better Auth's `user.id` is the internal auth record ID, not the MP `User_GUID`.

```typescript
// src/components/shared-actions/user.ts — getCurrentUserProfile (takes no arguments)
const session = await auth.api.getSession({ headers: await headers() });
const userGuid = (session?.user as Record<string, unknown> | undefined)?.userGuid;
if (typeof userGuid !== 'string' || userGuid.length === 0) throw new Error('Unauthorized');

const userService = await UserService.getInstance();
return userService.getUserProfile(userGuid);
```

The GUID comes from the session only — never an action parameter (a `userGuid` argument was an IDOR).

See `../auth/sessions.md` for `userGuid` vs `user.id`.

## Consumers

| Action | File | Method |
|--------|------|--------|
| `getCurrentUserProfile` | `src/components/shared-actions/user.ts` | `getUserProfile` |

## Gotchas
- `getUserProfile` does NOT re-check the session and has **no** `AuthorizationService` gate — the only service method without one. Its sole caller, `getCurrentUserProfile`, is a documented CLAUDE.md rule-12 carve-out (own profile only). Any new caller must gate itself.
- If `dp_Users` has 0 rows for the GUID, `getUserProfile` returns `undefined` (not throw).
- The `select` string has no spaces after some commas (`...Nickname,Contact_ID_TABLE...`) — MP REST accepts this; do not "fix" unless the API starts rejecting it.

## Related docs
- `query-patterns.md` — FK traversal + validation rules
- `../auth/sessions.md` — `userGuid` vs `user.id`
- `../components/layout.md` — `getCurrentUserProfile`

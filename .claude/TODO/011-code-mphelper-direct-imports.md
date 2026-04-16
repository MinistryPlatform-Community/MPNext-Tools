# Server Actions Import MPHelper Directly (Should Use Services)

**Severity:** LOW  
**Category:** Architecture  

## Problem

Per CLAUDE.md rule #9: "Use service classes in server actions — call services from `src/services/`, not MPHelper directly." However, 4 server action files import and use `MPHelper` directly to query `dp_Users` for the User_ID lookup:

| File | Usage |
|------|-------|
| `src/components/address-labels/actions.ts` | `new MPHelper()` to query dp_Users |
| `src/components/group-wizard/actions.ts` | `new MPHelper()` to query dp_Users |
| `src/components/tool/selection-debug-actions.ts` | `new MPHelper()` to query dp_Users |
| `src/components/user-tools-debug/actions.ts` | `new MPHelper()` to query dp_Users |

All four perform the same pattern: query `dp_Users` WHERE `User_GUID = '${userGuid}'` to get `User_ID`.

## Recommended Fix

Extract this common pattern into a shared helper method on `UserService`:

```typescript
// In UserService
public async getUserIdByGuid(guid: string): Promise<number> { ... }
```

Then update all server actions to use `UserService` instead of `MPHelper` directly.

---
title: services
type: index
domain: services
---

## What's in this domain
Application service layer — singletons that wrap `MPHelper` and expose domain operations (tools, users, groups, address labels, field management) to server actions. All 5 services follow the same lazy-initialized `getInstance()` pattern.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `query-patterns.md` | MP REST query rules: `_TABLE_` FK traversal, ambiguous-column prefixing, quote escaping, `$userId` audit, batching | Before writing/modifying any MP query in a service |
| `tool-service.md` | `ToolService` — pages, user tools, selection resolution, contact-ID resolver, dev-tool deploy | Editing `src/services/toolService.ts` or its callers |
| `user-service.md` | `UserService` — profile fetch with roles + groups, GUID→ID lookup | Editing user profile/session code |
| `address-label-service.md` | `AddressLabelService` — Contacts→Households→Addresses multi-level FK join | Editing address-label feature |
| `group-service.md` | `GroupService` — lookup fetching, contact/group search, group CRUD with date coercion | Editing group-wizard feature |
| `field-management-service.md` | `FieldManagementService` — page field editor backing store, `api_MPNextTools_*` SPs | Editing field-management feature |

## Code surfaces
| Path | Role |
|------|------|
| `src/services/toolService.ts` | `ToolService` singleton |
| `src/services/userService.ts` | `UserService` singleton |
| `src/services/addressLabelService.ts` | `AddressLabelService` singleton |
| `src/services/groupService.ts` | `GroupService` singleton |
| `src/services/fieldManagementService.ts` | `FieldManagementService` singleton |
| `src/services/*.test.ts` | Vitest suites (one per service) |
| `src/lib/providers/ministry-platform/helper.ts` | `MPHelper` — the only dependency services construct |
| `src/lib/validation.ts` | `validateGuid`, `validatePositiveInt`, `validateColumnName`, `escapeFilterString` — used by services |

## Services inventory (5)
| Service | One-liner |
|---------|-----------|
| `ToolService` | Resolves MP pages, user tools, selection record IDs, contact IDs; also deploys dev tools |
| `UserService` | Fetches MP user profile (by `User_GUID`) plus roles and user-group memberships |
| `AddressLabelService` | Pulls mailing addresses for contacts via multi-level FK traversal |
| `GroupService` | Group-wizard lookups, contact/group search, group create/update with date coercion |
| `FieldManagementService` | Lists MP pages, reads `dp_Page_Fields`, persists field-order edits |

## Data flow
```
Server Action ("use server")
  -> auth.api.getSession({ headers })    // validate session
  -> Service.getInstance()               // lazy singleton
    -> service method (typed)
      -> MPHelper.getTableRecords / executeProcedureWithBody / createTableRecords / updateTableRecords
        -> Ministry Platform REST API
```

## Related domains
- `../mp-provider/README.md` — `MPHelper` and underlying HTTP/provider layer
- `../mp-schema/README.md` — table/stored-proc reference used by these services
- `../data-flow/README.md` — end-to-end server action → service → MP flow
- `../auth/README.md` — `session.user.userGuid` used before calling services
- `../components/README.md` — server actions that call services
- `../testing/README.md` — mock patterns (`vi.hoisted`, MPHelper class mock, singleton reset)

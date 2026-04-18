---
title: Data model usage map
domain: mp-schema
type: reference
applies_to: [src/services/**, src/components/**/actions.ts]
symbols: []
related: [tables.md, stored-procs.md, required-procs.md, ../services/query-patterns.md]
last_verified: 2026-04-17
---

## Purpose
Bridges the 301-table MP schema catalog (`tables.md`) to what the application actually queries. Useful for understanding data access patterns and impact of schema changes. All MP reads/writes flow through `src/services/**` (component `actions.ts` files never call `MPHelper` directly).

## Hot tables (most-queried in src/)

Call site = one invocation of `getTableRecords`/`createTableRecords`/`updateTableRecords` against that table. `deleteTableRecords` is not called from any app service.

| Table | Call sites | Consumers |
|---|---|---|
| `Groups` | 4 | `src/services/groupService.ts:164` (searchGroups), `:174` (getGroup), `:232` (createGroup), `:245` (updateGroup) |
| `Contacts` | 3 | `src/services/groupService.ts:153` (searchContacts), `src/services/addressLabelService.ts:79` (getAddressesForContacts), `:96` (getAddressForContact) |
| `dp_Users` | 2 | `src/services/userService.ts:69` (getUserIdByGuid), `:82` (getUserProfile) |
| `dp_User_Roles` | 1 | `src/services/userService.ts:93` (roles in getUserProfile) |
| `dp_User_User_Groups` | 1 | `src/services/userService.ts:98` (user groups in getUserProfile) |
| `dp_Roles` | 1 | `src/services/toolService.ts:232` (listRoles) |
| `Group_Types` | 1 | `src/services/groupService.ts:63` (fetchAllLookups) |
| `Ministries` | 1 | `src/services/groupService.ts:68` |
| `Congregations` | 1 | `src/services/groupService.ts:74` |
| `Meeting_Days` | 1 | `src/services/groupService.ts:80` |
| `Meeting_Frequencies` | 1 | `src/services/groupService.ts:85` |
| `Meeting_Durations` | 1 | `src/services/groupService.ts:90` |
| `Life_Stages` | 1 | `src/services/groupService.ts:95` |
| `Group_Focuses` | 1 | `src/services/groupService.ts:100` |
| `Priorities` | 1 | `src/services/groupService.ts:105` |
| `Rooms` | 1 | `src/services/groupService.ts:110` |
| `Books` | 1 | `src/services/groupService.ts:116` |
| `dp_SMS_Numbers` | 1 | `src/services/groupService.ts:121` |
| `Group_Ended_Reasons` | 1 | `src/services/groupService.ts:127` |
| `<dynamic>` | 1 | `src/services/toolService.ts:335` (resolveContactIds — table name supplied at runtime from `api_Tools_GetPageData` result) |

Unique tables touched (excluding the dynamic case): **19**. Lookup tables at `groupService.fetchAllLookups` dominate the count but each fires once per wizard load.

## FK traversals used

Scanned from `$select`/`orderBy` strings using the `_TABLE` suffix convention.

| FK chain (in `$select`/`orderBy`) | Base table | Consumer (file:line) | Purpose |
|---|---|---|---|
| `Contact_ID_TABLE.First_Name` | `dp_Users` | `src/services/userService.ts:85` | User profile name (via linked Contact) |
| `Contact_ID_TABLE.Nickname` | `dp_Users` | `src/services/userService.ts:85` | Preferred display name |
| `Contact_ID_TABLE.Last_Name` | `dp_Users` | `src/services/userService.ts:85` | User profile surname |
| `Contact_ID_TABLE.Email_Address` | `dp_Users` | `src/services/userService.ts:85` | User profile email |
| `Contact_ID_TABLE.Mobile_Phone` | `dp_Users` | `src/services/userService.ts:85` | User profile phone |
| `Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID` | `dp_Users` | `src/services/userService.ts:85` | User avatar image GUID |
| `Role_ID_TABLE.Role_Name` | `dp_User_Roles` | `src/services/userService.ts:96` | Role labels for the authenticated user |
| `User_Group_ID_TABLE.User_Group_Name` | `dp_User_User_Groups` | `src/services/userService.ts:101` | User-group labels for the authenticated user |
| `Group_Type_ID_TABLE.Group_Type` | `Groups` | `src/services/groupService.ts:166` | Group search result badge |
| `Household_ID_TABLE.Household_Name` | `Contacts` | `src/services/addressLabelService.ts:29` | Household label on mailing labels |
| `Household_ID_TABLE.Bulk_Mail_Opt_Out` | `Contacts` | `src/services/addressLabelService.ts:30` | Opt-out filter for bulk mailings |
| `Household_ID_TABLE_Address_ID_TABLE.Address_Line_1` | `Contacts` | `src/services/addressLabelService.ts:31` | 2-level FK → household address line 1 |
| `Household_ID_TABLE_Address_ID_TABLE.Address_Line_2` | `Contacts` | `src/services/addressLabelService.ts:32` | 2-level FK → household address line 2 |
| `Household_ID_TABLE_Address_ID_TABLE.City` | `Contacts` | `src/services/addressLabelService.ts:33` | 2-level FK → city |
| `Household_ID_TABLE_Address_ID_TABLE.[State/Region]` | `Contacts` | `src/services/addressLabelService.ts:34` | 2-level FK → state (bracketed due to `/`) |
| `Household_ID_TABLE_Address_ID_TABLE.Postal_Code` | `Contacts` | `src/services/addressLabelService.ts:35`, `:83` (orderBy) | 2-level FK → ZIP; also `orderBy` |
| `Household_ID_TABLE_Address_ID_TABLE.Bar_Code` | `Contacts` | `src/services/addressLabelService.ts:36` | 2-level FK → USPS delivery barcode |
| `Household_ID_TABLE_Address_ID_TABLE.Delivery_Point_Code` | `Contacts` | `src/services/addressLabelService.ts:37` | 2-level FK → delivery point |

Note the `Contacts.Household_ID` disambiguation at `src/services/addressLabelService.ts:28` — required because `Household_ID` exists on both `Contacts` and the joined `Households` table. See `../services/query-patterns.md` for the rule.

## Stored procs called in code

Cross-referenced with `required-procs.md`. All call via `MPHelper.executeProcedureWithBody`.

| Proc | Caller (file:line) | Purpose |
|---|---|---|
| `api_Tools_GetPageData` | `src/services/toolService.ts:127` (getPageData) | Resolve Page_ID → table name + primary key |
| `api_Common_GetSelection` | `src/services/toolService.ts:154` (getSelectionRecordIds) | Selection_ID → Record_ID[] |
| `api_Tools_GetUserTools` | `src/services/toolService.ts:185` (getUserTools) | User_ID → authorized Tool_Path[] |
| `api_MPNextTools_GetPages` | `src/services/toolService.ts:207` (listPages), `src/services/fieldManagementService.ts:44` (getPages) | List MP pages for pickers |
| `api_MPNextTools_GetPageFields` | `src/services/fieldManagementService.ts:54` (getPageFields) | Per-page field metadata |
| `api_MPNextTools_UpdatePageFieldOrder` | `src/services/fieldManagementService.ts:94` (updatePageFieldOrder) | Upsert field config (batched, concurrency 5) |
| `api_dev_DeployTool` | `src/services/toolService.ts:268` (deployTool) | Dev-creds deployment of a tool |

## Common filter patterns

- `End_Date IS NULL` — active-row filter on `Ministries`, `Congregations`, `Groups`. `src/services/groupService.ts:71`, `:77`, `:167`.
- `Active = 1` — `dp_SMS_Numbers` active filter. `src/services/groupService.ts:124`.
- `Bookable = 1` — `Rooms` filter. `src/services/groupService.ts:113`.
- `<Name> LIKE '<escaped>%'` — prefix search (user-provided term is passed through `escapeFilterString`). `src/services/groupService.ts:156` (contacts), `:167` (groups); `src/services/toolService.ts:229` uses `%term%` for roles.
- `<PK> IN (<csv>)` — batched ID lookups (batch size 100). `src/services/addressLabelService.ts:82`, `src/services/toolService.ts:338`.
- `User_GUID = '<validated>'` — GUID lookup on `dp_Users` (passed through `validateGuid`). `src/services/userService.ts:72`, `:84`.
- `<PK> = <validatedInt>` — single-record lookup (input through `validatePositiveInt`). `src/services/groupService.ts:176`.

All user-supplied strings in filters are escaped via `escapeFilterString` or validated via `validateGuid`/`validatePositiveInt`/`validateColumnName` from `src/lib/validation.ts`.

## Scope

Code touches **19 unique tables** (+1 runtime-resolved table in `ToolService.resolveContactIds`) out of **301** in the MP schema (~6%). The remaining ~94% are untouched by application code; they are not enumerated here. Full schema is in `tables.md`.

## Related docs

- [tables.md](tables.md) — full 301-table schema with PKs and FKs
- [stored-procs.md](stored-procs.md) — full 532-proc catalog
- [required-procs.md](required-procs.md) — the 7 procs wired into app services
- [../services/query-patterns.md](../services/query-patterns.md) — FK traversal rules, `_TABLE` chaining, ambiguous-column disambiguation
- [../services/README.md](../services/README.md) — service layer overview

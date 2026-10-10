---
title: Data model usage map
domain: mp-schema
type: reference
applies_to: [src/services/**, src/components/**/actions.ts]
symbols: []
related: [tables.md, stored-procs.md, required-procs.md, ../services/query-patterns.md]
last_verified: 2026-10-10
---

## Purpose
Bridges the 301-table MP schema catalog (`tables.md`) to what the application actually queries. Useful for understanding data access patterns and impact of schema changes. All MP reads/writes flow through `src/services/**` (component `actions.ts` files never call `MPHelper` directly).

## Hot tables (most-queried in src/)

Call site = one invocation of `getTableRecords`/`createTableRecords`/`updateTableRecords` against that table. `deleteTableRecords` is not called from any app service.

| Table | Call sites | Consumers |
|---|---|---|
| `Contacts` | 10 | `src/services/groupService.ts:248` (searchContacts); `src/services/addressLabelService.ts:86` (getAddressesForContacts), `:109` (getAddressForContact); `src/services/familyService.ts:118` (searchContacts), `:200`, `:243` (getHousehold), `:614`/`:621` (saveMember update/create), `:668` (link `Participant_Record`), `:794` (link `Donor_Record`) |
| `Groups` | 4 | `src/services/groupService.ts:263` (searchGroups), `:280` (getGroup), `:374` (createGroup), `:398` (updateGroup) |
| `Donors` | 4 | `src/services/familyService.ts:465` (getNextEnvelopeNumber), `:738` (resolveUniqueEnvelopeNo), `:772`/`:788` (upsertDonor update/create) |
| `Households` | 3 | `src/services/familyService.ts:214` (getHousehold), `:515`/`:524` (saveHousehold create/update) |
| `Addresses` | 2 | `src/services/familyService.ts:564`/`:572` (upsertAddress update/create) |
| `Participants` | 2 | `src/services/familyService.ts:633`/`:646` (saveMember update/create) |
| `Congregations` | 2 | `src/services/groupService.ts:164` (fetchAllLookups), `src/services/familyService.ts:360` (getLookups) |
| `dp_Users` | 2 | `src/services/authorizationService.ts:44` (`resolveUserId`), `src/services/userService.ts:60` (`getUserProfile`) |
| `dp_User_Roles` | 1 | `src/services/authorizationService.ts:57` (`loadSecurityRoles`) |
| `dp_Roles` | 1 | `src/services/toolService.ts:257` (listRoles) |
| `dp_Configuration_Settings` | 1 | `src/services/googlePlacesService.ts:35` (resolveApiKey — `GoogleMapsAPIKey`) |
| `Group_Types`, `Ministries`, `Meeting_Days`, `Meeting_Frequencies`, `Meeting_Durations`, `Life_Stages`, `Group_Focuses`, `Priorities`, `Rooms`, `Books`, `dp_SMS_Numbers`, `Group_Ended_Reasons` | 1 each | `src/services/groupService.ts:153`–`:217` (fetchAllLookups) |
| `Household_Sources`, `Household_Positions`, `Participant_Types`, `Marital_Statuses`, `Prefixes`, `Suffixes`, `Genders`, `Contact_Statuses`, `Primary_Languages`, `Faith_Backgrounds`, `Countries` | 1 each | `src/services/familyService.ts:366`–`:416` (getLookups) |
| `<dynamic>` | 2 | `src/services/toolService.ts:372` (resolveContactIds — table from `api_Tools_GetPageData`), `src/services/familyService.ts:182` (resolveContactIdFromPage — table/PK/FK path from the caller, validated with `validateColumnName`/`validateFkPath`) |

Unique tables touched (excluding the dynamic cases): **34**. Lookup tables (`groupService.fetchAllLookups`, `familyService.getLookups`) dominate the count but each fires once per wizard/form load.

## FK traversals used

Scanned from `$select`/`orderBy` strings using the `_TABLE` suffix convention.

| FK chain (in `$select`/`orderBy`) | Base table | Consumer (file:line) | Purpose |
|---|---|---|---|
| `Contact_ID_TABLE.{First_Name,Nickname,Last_Name,Email_Address}` | `dp_Users` | `src/services/userService.ts:63` (`getUserProfile`) | User profile via linked Contact |
| `Role_ID_TABLE.Role_Name` | `dp_User_Roles` | `src/services/authorizationService.ts:59` (`loadSecurityRoles`) | Security-role names for the authorization gate |
| `Group_Type_ID_TABLE.Group_Type` | `Groups` | `src/services/groupService.ts:265` | Group search result badge |
| `Primary_Contact_TABLE.Display_Name`, `Parent_Group_TABLE.Group_Name`, `Promote_to_Group_TABLE.Group_Name`, `Descended_From_TABLE.Group_Name` (all `AS` aliases) | `Groups` | `src/services/groupService.ts:280` (getGroup) | Display names for edit-mode seeding |
| `Household_ID_TABLE.Household_Name` | `Contacts` | `src/services/addressLabelService.ts:30` | Household label on mailing labels |
| `Household_ID_TABLE.Bulk_Mail_Opt_Out` | `Contacts` | `src/services/addressLabelService.ts:31` | Opt-out filter for bulk mailings |
| `Household_ID_TABLE_Address_ID_TABLE.{Address_Line_1,Address_Line_2,City,[State/Region],Postal_Code,Bar_Code,Delivery_Point_Code}` | `Contacts` | `src/services/addressLabelService.ts:32-38`, `:90` (orderBy `Postal_Code`) | 2-level FK → household address (`[State/Region]` bracketed due to `/`) |
| `Household_ID_TABLE_Address_ID_TABLE.Address_Line_1` | `Contacts` | `src/services/familyService.ts:129` (searchContacts) | Address hint in contact search |
| `Address_ID_TABLE.*`, `Alternate_Mailing_Address_TABLE.*` (`AS Addr1_*` / `Addr2_*`) | `Households` | `src/services/familyService.ts:227-238` | Main + alternate mailing address |
| `Participant_Record_TABLE.Participant_Type_ID`, `Donor_Record_TABLE.Envelope_No` | `Contacts` | `src/services/familyService.ts:267-268` | Member participant type + envelope |

Note the `Contacts.Household_ID` disambiguation at `src/services/addressLabelService.ts:29` — required because `Household_ID` exists on both `Contacts` and the joined `Households` table. `familyService.getHousehold` prefixes every column (`Households.*`, `Contacts.*`) for the same reason. See `../services/query-patterns.md` for the rule.

## Stored procs called in code

Cross-referenced with `required-procs.md`. All call via `MPHelper.executeProcedureWithBody`.

| Proc | Caller (file:line) | Purpose |
|---|---|---|
| `api_Tools_GetPageData` | `src/services/toolService.ts:134` (getPageData) | Resolve Page_ID → table name + primary key |
| `api_Common_GetSelection` | `src/services/toolService.ts:168` (getSelectionRecordIds) | Selection_ID → Record_ID[] |
| `api_Tools_GetUserTools` | `src/services/toolService.ts:202` (getUserTools) | User_ID → authorized Tool_Path[] |
| `api_MPNextTools_GetPages` | `src/services/toolService.ts:228` (listPages), `src/services/fieldManagementService.ts:50` (getPages) | List MP pages for pickers |
| `api_MPNextTools_GetPageFields` | `src/services/fieldManagementService.ts:64` (getPageFields) | Per-page field metadata |
| `api_MPNextTools_UpdatePageFieldOrder` | `src/services/fieldManagementService.ts:118` (updatePageFieldOrder) | Upsert field config (batched, concurrency 5) |
| `api_dev_DeployTool` | `src/services/toolService.ts:297` (deployTool) | Dev-creds deployment of a tool |

## Common filter patterns

- `End_Date IS NULL` — active-row filter on `Ministries`, `Congregations`, `Groups`. `src/services/groupService.ts:161`, `:167`, `:266`; `src/services/familyService.ts:363`.
- `Active = 1` — `dp_SMS_Numbers` active filter. `src/services/groupService.ts:214`.
- `Bookable = 1` — `Rooms` filter. `src/services/groupService.ts:203`.
- `<Name> LIKE '<escaped>%'` — prefix search (user-provided term is passed through `escapeFilterString`). `src/services/groupService.ts:251` (contacts), `:266` (groups); `src/services/familyService.ts:131` (contacts, plus `Contact_Status_ID = 1`); `src/services/toolService.ts:254` uses `%term%` for roles.
- `<PK> IN (<csv>)` — batched ID lookups (`MP_FETCH_BATCH_SIZE` = 100, `src/lib/constants.ts`). `src/services/addressLabelService.ts:89`, `src/services/toolService.ts:375`.
- `User_GUID = '<validated>'` — GUID lookup on `dp_Users` (passed through `validateGuid`). `src/services/userService.ts:62`, `src/services/authorizationService.ts:47`.
- `<PK> = <validatedInt>` — single-record lookup (input through `validatePositiveInt`). `src/services/groupService.ts:289`, `src/services/familyService.ts:185`, `:206`.
- `MAX(Envelope_No) AS Highest` — aggregate in `$select` on `Donors`. `src/services/familyService.ts:467`.

All user-supplied strings in filters are escaped via `escapeFilterString` or validated via `validateGuid`/`validatePositiveInt`/`validateColumnName`/`validateFkPath` from `src/lib/validation.ts`.

## Scope

Code touches **34 unique tables** (+ runtime-resolved tables in `ToolService.resolveContactIds` and `FamilyService.resolveContactIdFromPage`) out of **301** in the MP schema (~11%). The rest are untouched by application code; they are not enumerated here. Full schema is in `tables.md`.

## Related docs

- [tables.md](tables.md) — full 301-table schema with PKs and FKs
- [stored-procs.md](stored-procs.md) — full 532-proc catalog
- [required-procs.md](required-procs.md) — the 7 procs wired into app services
- [../services/query-patterns.md](../services/query-patterns.md) — FK traversal rules, `_TABLE` chaining, ambiguous-column disambiguation
- [../services/README.md](../services/README.md) — service layer overview

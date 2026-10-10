---
title: Required Stored Procedures
domain: mp-schema
type: reference
applies_to: [src/services/toolService.ts, src/services/fieldManagementService.ts, src/lib/providers/ministry-platform/services/procedure.service.ts, src/lib/providers/ministry-platform/helper.ts]
symbols: [api_Tools_GetPageData, api_Common_GetSelection, api_Tools_GetUserTools, api_MPNextTools_GetPages, api_MPNextTools_GetPageFields, api_MPNextTools_UpdatePageFieldOrder, api_dev_DeployTool]
related: [stored-procs.md, ../services/README.md]
last_verified: 2026-10-10
---

## Purpose
Stored procedures actively invoked by the application (7 procs). All are called via `MPHelper.executeProcedureWithBody()` from service singletons.

## Quick index

| Proc | Caller | Notes |
|------|--------|-------|
| `api_Tools_GetPageData` | `ToolService.getPageData()` | Page metadata lookup |
| `api_Common_GetSelection` | `ToolService.getSelectionRecordIds()` | Selection → Record_ID[]; `@UserID` from the auth gate |
| `api_Tools_GetUserTools` | `ToolService.getUserTools()` | User → tool paths; `@UserId` from the auth gate |
| `api_MPNextTools_GetPages` | `ToolService.listPages()`, `FieldManagementService.getPages()` | No params; in-memory filter |
| `api_MPNextTools_GetPageFields` | `FieldManagementService.getPageFields()` | Per-page field metadata |
| `api_MPNextTools_UpdatePageFieldOrder` | `FieldManagementService.updatePageFieldOrder()` | Per-field mutation |
| `api_dev_DeployTool` | `ToolService.deployTool()` | Dev-creds-only deployment |

## Calling convention

- HTTP: `POST /procs/{procedureName}` with body `{ "@ParamName": value, ... }`
- Return: `unknown[][]` (array of result sets, each an array of row objects)
- `@DomainID` is auto-injected by the MP API — never pass it. SQL side: every `api_*` proc must declare `@DomainID INT` as its **first** parameter or MP will not expose it; all procs in `src/lib/providers/ministry-platform/db/` do
- Every caller runs `AuthorizationService.requireSecurityRole(...)` before the call; user IDs passed to procs come from that gate's return value, never from the caller

Call chain:

```
Server Action → {ToolService | FieldManagementService} (singleton) → MPHelper.executeProcedureWithBody() → ProcedureService → HTTP POST /procs/{name}
```

---

## api_Tools_GetPageData

**Purpose:** Retrieves page metadata (table name, primary key, display name) for a given MP Page ID. Used to resolve which table and key column a tool selection targets.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID   | Input     | Integer32 | Ministry Platform Page ID |

**Return:** First result set, first row → `PageData` (`src/lib/tool-params.ts:14`): `Page_ID`, `Display_Name`, `Singular_Name`, `Table_Name`, `Primary_Key`, plus optional fields such as `Contact_ID_Field`, `Selected_Record_Expression`, `Filter_Clause`.

**DDL:** not in this repo (MP-provided proc).

**Called by:** `ToolService.getPageData(pageID)` at `src/services/toolService.ts:126` (call at `:134`)

**Consumer(s):**
- `resolveContactIdFromPage()` in `src/app/(web)/tools/addeditfamily/actions.ts`
- `ToolService.resolveContactIds()` (internal) → `resolveContactRecords()` in `src/components/dev-panel/panels/contact-records-actions.ts`

---

## api_Common_GetSelection

**Purpose:** Retrieves record IDs from a user's MP selection (the "selected records" context passed to cloud tools). Returns a result set containing `Record_ID` values.

| Parameter    | Direction | Data Type | Description |
|--------------|-----------|-----------|-------------|
| @SelectionID | Input     | Integer32 | Selection identifier |
| @UserID      | Input     | Integer32 | MP User ID |
| @PageID      | Input     | Integer32 | MP Page ID |

**Return:** Searches all result sets for one containing `Record_ID` column → extracts `number[]`.

**DDL:** not in this repo (MP-provided proc).

**Called by:** `ToolService.getSelectionRecordIds(selectionId, pageId)` at `src/services/toolService.ts:162` (call at `:168`). `@UserID` is the gate's return value — never caller-supplied.

**Consumer(s):**
- `fetchAddressLabels()` in `src/components/address-labels/actions.ts`
- `resolveSelection()` in `src/components/dev-panel/panels/selection-actions.ts`

---

## api_Tools_GetUserTools

**Purpose:** Returns the tool paths (routes) a user is authorized to access, based on their roles and domain.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @UserId   | Input     | Integer32 | MP User ID |

**Return:** First result set → array of `{ Tool_Path: string }`.

**DDL:** not in this repo (MP-provided proc).

**Called by:** `ToolService.getUserTools()` at `src/services/toolService.ts:196` (call at `:202`). `@UserId` is the gate's return value.

**Consumer(s):**
- `getUserTools()` in `src/components/dev-panel/panels/user-tools-actions.ts`

---

## api_MPNextTools_GetPages

**Purpose:** Lists every MP `dp_Pages` row (`Page_ID, Display_Name, Table_Name`, ordered by `Display_Name`) for the deploy-tool and field-management pickers. SP takes no search param; callers filter in-memory and cap results.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| (none)    | —         | —         | — |

**Return:** First result set → `PageListItem[]` with `{ Page_ID, Display_Name, Table_Name }`.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_GetPages.sql`

**Called by:**
- `ToolService.listPages(search?)` at `src/services/toolService.ts:223` (in-memory filter on `Display_Name`/`Table_Name`, capped at 100)
- `FieldManagementService.getPages()` at `src/services/fieldManagementService.ts:45`

---

## api_MPNextTools_GetPageFields

**Purpose:** Returns the field-configuration rows for a given MP page (for the field-management editor).

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID   | Input     | Integer32 | Ministry Platform Page ID |

**Return:** First result set → `PageField[]` with columns: `Page_Field_ID, Page_ID, Field_Name, Group_Name, View_Order, Required, Hidden, Default_Value, Filter_Clause, Depends_On_Field, Field_Label, Writing_Assistant_Enabled`.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_GetPageFields.sql`

**Called by:** `FieldManagementService.getPageFields(pageId)` at `src/services/fieldManagementService.ts:59`

---

## api_MPNextTools_UpdatePageFieldOrder

**Purpose:** Upserts a single field's page-configuration row (view order, required/hidden flags, label, filter clause, etc.). Invoked once per edited field; `FieldManagementService` parallelizes with concurrency 5.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID | Input | INT | Page ID |
| @FieldName | Input | VARCHAR(64) | Field column name |
| @GroupName | Input | NVARCHAR(75) = NULL | UI group name |
| @ViewOrder | Input | SMALLINT = NULL | Display order |
| @Required | Input | BIT = 0 | Required flag |
| @Hidden | Input | BIT = 0 | Hidden flag |
| @DefaultValue | Input | NVARCHAR(128) = NULL | Default literal |
| @FilterClause | Input | NVARCHAR(2000) = NULL | Lookup filter clause |
| @DependsOnField | Input | VARCHAR(64) = NULL | Dependency field name |
| @FieldLabel | Input | NVARCHAR(64) = NULL | Display label |
| @WritingAssistantEnabled | Input | BIT = 0 | AI-assist toggle |

**Return:** Not consumed.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_UpdatePageFieldOrder.sql`

**Called by:** `FieldManagementService.updatePageFieldOrder(...)` at `src/services/fieldManagementService.ts:90` (call at `:118`, batches of `CONCURRENCY = 5`)

---

## api_dev_DeployTool

**Purpose:** Creates or updates a tool (`Tools`, `Tool_Pages`, `Role_Tools` rows) so it appears in the MP Cloud Tools menu. Because the procedure name starts with `api_dev_`, the MP provider auto-uses `MINISTRY_PLATFORM_DEV_*` client credentials — must not be reachable from production.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @ToolName | Input | NVARCHAR(30) | Tool name |
| @LaunchPage | Input | NVARCHAR(1024) | Launch URL / route |
| @Description | Input | NVARCHAR(100) = NULL | Tool description |
| @LaunchWithCredentials | Input | BIT = 1 | Include creds on launch |
| @LaunchWithParameters | Input | BIT = 1 | Include params on launch |
| @LaunchInNewTab | Input | BIT = 0 | Open in new tab |
| @ShowOnMobile | Input | BIT = 0 | Visible on mobile |
| @PageIDs | Input | NVARCHAR(MAX) = NULL | Comma-joined `Page_ID` list |
| @AdditionalData | Input | NVARCHAR(65) = NULL | Applied to each inserted `dp_Tool_Pages` row |
| @RoleIDs | Input | NVARCHAR(MAX) = NULL | Comma-joined `Role_ID` list; Administrators auto-included |

**Return:** 3 result sets — `[toolRow]`, `pageRows[]`, `roleRows[]`. Consumed as `DeployToolResult`.

**DDL:** `src/lib/providers/ministry-platform/db/api_dev_DeployTool.sql`

**Called by:** `ToolService.deployTool(input)` at `src/services/toolService.ts:272` (call at `:297`, with `{ $userId }` from the gate as a query param)

---

## Infrastructure

| File | Role |
|------|------|
| `src/lib/providers/ministry-platform/services/procedure.service.ts` | HTTP calls to `/procs/{name}` (GET for query params, POST for body params) |
| `src/lib/providers/ministry-platform/provider.ts` | Singleton delegating to `ProcedureService` |
| `src/lib/providers/ministry-platform/helper.ts` | Public facade: `executeProcedure()`, `executeProcedureWithBody()`, `getProcedures()` |
| `src/services/toolService.ts` | Application service wrapping `api_Tools_GetPageData`, `api_Common_GetSelection`, `api_Tools_GetUserTools`, `api_MPNextTools_GetPages` (partial), `api_dev_DeployTool` |
| `src/services/fieldManagementService.ts` | Application service wrapping `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder` |

## Installed but not called by app code

These ship in `src/lib/providers/ministry-platform/db/` (combined into `_INSTALL/ministryplatform-install.sql` by `npm run mp:build:install`) but nothing in `src/` invokes them. All declare `@DomainID INT` first.

| Proc | DDL |
|---|---|
| `api_Common_GenerateSlug` | `db/api_Common_GenerateSlug.sql` |
| `api_Common_StoredProcParameters` | `db/api_Common_StoredProcParameters.sql` (skips `@DomainID` when listing params, `:92`) |
| `api_dev_GetProcedureDefinition` | `db/api_dev_GetProcedureDefinition.sql` |
| `api_MPNextTools_GetAuditLog` | `db/api_MPNextTools_GetAuditLog.sql` |

`api_CloudTools_GetSelection` (in `stored-procs.md`) is the legacy name; only `api_Common_GetSelection` is called.

## Related docs

- `stored-procs.md` — full catalog of all 532 procedures
- `../services/README.md` — service layer that wraps these calls

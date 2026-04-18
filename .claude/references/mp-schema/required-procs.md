---
title: Required Stored Procedures
domain: mp-schema
type: reference
applies_to: [src/services/toolService.ts, src/services/fieldManagementService.ts, src/lib/providers/ministry-platform/services/procedure.service.ts, src/lib/providers/ministry-platform/helper.ts]
symbols: [api_Tools_GetPageData, api_Common_GetSelection, api_Tools_GetUserTools, api_MPNextTools_GetPages, api_MPNextTools_GetPageFields, api_MPNextTools_UpdatePageFieldOrder, api_dev_DeployTool]
related: [stored-procs.md, ../services/README.md]
last_verified: 2026-04-17
---

## Purpose
Stored procedures actively invoked by the application (7 procs). All are called via `MPHelper.executeProcedureWithBody()` from service singletons.

## Quick index

| Proc | Caller | Notes |
|------|--------|-------|
| `api_Tools_GetPageData` | `ToolService.getPageData()` | Page metadata lookup |
| `api_Common_GetSelection` | `ToolService.getSelectionRecordIds()` | Selection → Record_ID[] |
| `api_Tools_GetUserTools` | `ToolService.getUserTools()` | User → tool paths |
| `api_MPNextTools_GetPages` | `ToolService.listPages()`, `FieldManagementService.getPages()` | No params; in-memory filter |
| `api_MPNextTools_GetPageFields` | `FieldManagementService.getPageFields()` | Per-page field metadata |
| `api_MPNextTools_UpdatePageFieldOrder` | `FieldManagementService.updatePageFieldOrder()` | Per-field mutation |
| `api_dev_DeployTool` | `ToolService.deployTool()` | Dev-creds-only deployment |

## Calling convention

- HTTP: `POST /procs/{procedureName}` with body `{ "@ParamName": value, ... }`
- Return: `unknown[][]` (array of result sets, each an array of row objects)
- `@DomainID` is auto-injected by the MP API

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

**Return:** First result set, first row → `PageData` (`src/lib/tool-params.ts`) with fields: `Page_ID`, `Display_Name`, `Table_Name`, `Primary_Key`.

**Called by:** `ToolService.getPageData(pageID)` at `src/services/toolService.ts:123`

**Consumer(s):**
- `fetchAddressLabels()` in `src/components/address-labels/actions.ts`

---

## api_Common_GetSelection

**Purpose:** Retrieves record IDs from a user's MP selection (the "selected records" context passed to cloud tools). Returns a result set containing `Record_ID` values.

| Parameter    | Direction | Data Type | Description |
|--------------|-----------|-----------|-------------|
| @SelectionID | Input     | Integer32 | Selection identifier |
| @UserID      | Input     | Integer32 | MP User ID |
| @PageID      | Input     | Integer32 | MP Page ID |

**Return:** Searches all result sets for one containing `Record_ID` column → extracts `number[]`.

**Called by:** `ToolService.getSelectionRecordIds(selectionId, userId, pageId)` at `src/services/toolService.ts:152`

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

**Called by:** `ToolService.getUserTools(userId)` at `src/services/toolService.ts:183`

**Consumer(s):**
- `getUserTools()` in `src/components/dev-panel/panels/user-tools-actions.ts`

---

## api_MPNextTools_GetPages

**Purpose:** Lists every MP `dp_Pages` row that MPNext Tools cares about (for deploy-tool and field-management pickers). SP takes no search param; callers filter in-memory and cap results.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| (none)    | —         | —         | — |

**Return:** First result set → `PageListItem[]` with `{ Page_ID, Display_Name, Table_Name }`.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_GetPages.sql`

**Called by:**
- `ToolService.listPages(search?)` at `src/services/toolService.ts:206`
- `FieldManagementService.getPages()` at `src/services/fieldManagementService.ts:43`

---

## api_MPNextTools_GetPageFields

**Purpose:** Returns the field-configuration rows for a given MP page (for the field-management editor).

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID   | Input     | Integer32 | Ministry Platform Page ID |

**Return:** First result set → `PageField[]` with columns: `Page_Field_ID, Page_ID, Field_Name, Group_Name, View_Order, Required, Hidden, Default_Value, Filter_Clause, Depends_On_Field, Field_Label, Writing_Assistant_Enabled`.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_GetPageFields.sql`

**Called by:** `FieldManagementService.getPageFields(pageId)` at `src/services/fieldManagementService.ts:53`

---

## api_MPNextTools_UpdatePageFieldOrder

**Purpose:** Upserts a single field's page-configuration row (view order, required/hidden flags, label, filter clause, etc.). Invoked once per edited field; `FieldManagementService` parallelizes with concurrency 5.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID | Input | Integer32 | Page ID |
| @FieldName | Input | String | Field column name |
| @GroupName | Input | String (nullable) | UI group name |
| @ViewOrder | Input | Integer32 | Display order |
| @Required | Input | Boolean | Required flag |
| @Hidden | Input | Boolean | Hidden flag |
| @DefaultValue | Input | String (nullable) | Default literal |
| @FilterClause | Input | String (nullable) | DDL filter |
| @DependsOnField | Input | String (nullable) | Dependency field name |
| @FieldLabel | Input | String (nullable) | Display label |
| @WritingAssistantEnabled | Input | Boolean | AI-assist toggle |

**Return:** Not consumed.

**DDL:** `src/lib/providers/ministry-platform/db/api_MPNextTools_UpdatePageFieldOrder.sql`

**Called by:** `FieldManagementService.updatePageFieldOrder(fields[])` at `src/services/fieldManagementService.ts:76`

---

## api_dev_DeployTool

**Purpose:** Creates or updates a tool (`Tools`, `Tool_Pages`, `Role_Tools` rows) so it appears in the MP Cloud Tools menu. Because the procedure name starts with `api_dev_`, the MP provider auto-uses `MINISTRY_PLATFORM_DEV_*` client credentials — must not be reachable from production.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @ToolName | Input | String(30) | Tool name |
| @LaunchPage | Input | String(1024) | Launch URL / route |
| @Description | Input | String(100) nullable | Tool description |
| @LaunchWithCredentials | Input | Bit (0/1) | Include creds on launch |
| @LaunchWithParameters | Input | Bit (0/1) | Include params on launch |
| @LaunchInNewTab | Input | Bit (0/1) | Open in new tab |
| @ShowOnMobile | Input | Bit (0/1) | Visible on mobile |
| @PageIDs | Input | String (CSV, nullable) | Comma-joined `Page_ID` list |
| @AdditionalData | Input | String(65) nullable | Free-form metadata |
| @RoleIDs | Input | String (CSV, nullable) | Comma-joined `Role_ID` list |

**Return:** 3 result sets — `[toolRow]`, `pageRows[]`, `roleRows[]`. Consumed as `DeployToolResult`.

**DDL:** `src/lib/providers/ministry-platform/db/api_dev_DeployTool.sql`

**Called by:** `ToolService.deployTool(input)` at `src/services/toolService.ts:247`

---

## Infrastructure

| File | Role |
|------|------|
| `src/lib/providers/ministry-platform/services/procedure.service.ts` | HTTP calls to `/procs/{name}` (GET for query params, POST for body params) |
| `src/lib/providers/ministry-platform/provider.ts` | Singleton delegating to `ProcedureService` |
| `src/lib/providers/ministry-platform/helper.ts` | Public facade: `executeProcedure()`, `executeProcedureWithBody()`, `getProcedures()` |
| `src/services/toolService.ts` | Application service wrapping `api_Tools_GetPageData`, `api_Common_GetSelection`, `api_Tools_GetUserTools`, `api_MPNextTools_GetPages` (partial), `api_dev_DeployTool` |
| `src/services/fieldManagementService.ts` | Application service wrapping `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder` |

## Note on `api_CloudTools_GetSelection`

The facts snapshot lists `api_CloudTools_GetSelection` as a referenced proc. As of 2026-04-17, only the newer `api_Common_GetSelection` is invoked from `ToolService`. The `CloudTools` name survives in code comments only — see TODO `2026-04-17-services-stale-cloudtools-comment.md`.

## Related docs

- `stored-procs.md` — full catalog of all 532 procedures
- `../services/README.md` — service layer that wraps these calls

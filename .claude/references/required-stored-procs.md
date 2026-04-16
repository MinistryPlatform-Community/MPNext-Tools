# Required Stored Procedures Reference

Stored procedures actively called by the application. All three are invoked via `MPHelper.executeProcedureWithBody()` from `ToolService` (`src/services/toolService.ts`).

## Calling Convention

All procedure calls go through the MP REST API:

```
POST /procs/{procedureName}
Body: { "@ParamName": value, ... }
```

The call chain is:

```
Server Action → ToolService (singleton) → MPHelper.executeProcedureWithBody() → ProcedureService → HTTP POST /procs/{name}
```

All procedures return `unknown[][]` (array of result sets, each an array of row objects).

---

## api_Tools_GetPageData

**Purpose:** Retrieves page metadata (table name, primary key, display name) for a given MP Page ID. Used to resolve which table and key column a tool selection targets.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @PageID   | Input     | Integer32 | Ministry Platform Page ID |

**Return:** First result set, first row → `PageData` (`src/lib/tool-params.ts`) with fields: `Page_ID`, `Display_Name`, `Table_Name`, `Primary_Key`.

**Called by:** `ToolService.getPageData(pageID)` at `src/services/toolService.ts:59`

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

**Called by:** `ToolService.getSelectionRecordIds(selectionId, userId, pageId)` at `src/services/toolService.ts:102`

**Consumer(s):**
- `fetchAddressLabels()` in `src/components/address-labels/actions.ts`
- `resolveSelection()` in `src/components/tool/selection-debug-actions.ts`

---

## api_Tools_GetUserTools

**Purpose:** Returns the tool paths (routes) a user is authorized to access, based on their roles and domain.

| Parameter | Direction | Data Type | Description |
|-----------|-----------|-----------|-------------|
| @UserId   | Input     | Integer32 | MP User ID |

Domain ID is injected automatically by the MP API — do not pass it.

**Return:** First result set → array of `{ Tool_Path: string }`.

**Called by:** `ToolService.getUserTools(userId)` at `src/services/toolService.ts:138`

**Consumer(s):**
- `getUserTools()` in `src/components/user-tools-debug/actions.ts`

---

## Infrastructure

The procedure execution layer lives in the Ministry Platform provider:

| File | Role |
|------|------|
| `src/lib/providers/ministry-platform/services/procedure.service.ts` | HTTP calls to `/procs/{name}` (GET for query params, POST for body params) |
| `src/lib/providers/ministry-platform/provider.ts` | Singleton delegating to `ProcedureService` |
| `src/lib/providers/ministry-platform/helper.ts` | Public facade: `executeProcedure()`, `executeProcedureWithBody()`, `getProcedures()` |
| `src/services/toolService.ts` | Application service wrapping all three procedure calls |

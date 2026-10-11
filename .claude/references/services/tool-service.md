---
title: ToolService
domain: services
type: reference
applies_to: [src/services/toolService.ts, src/services/toolService.test.ts]
symbols: [ToolService, ContactRecord, ContactRecordResult, PageLookup, RoleLookup, DeployToolInput, DeployToolResult]
related: [query-patterns.md, ../mp-schema/required-procs.md, ../components/dev-panel.md]
last_verified: 2026-10-10
---

## Purpose
Resolves MP page metadata, user tool authorization, selection record IDs, and contact-ID mappings. Also backs the localhost-only dev-tool deployer.

## Files
- `src/services/toolService.ts` — singleton implementation
- `src/services/toolService.test.ts` — 672 lines; covers every public method including error paths, batching, authorization gating, and `deployTool` payload shaping

## Authorization
Every public method calls `AuthorizationService.getInstance().requireSecurityRole({ table, operation })` before touching MP (see `../security/README.md`). The returned `User_ID` is the acting user for `getSelectionRecordIds` / `getUserTools` and the `$userId` for `deployTool` — callers never pass a user ID.

| Method | Gate `table` / `operation` |
|--------|---------------------------|
| `getPageData` | `dp_Pages` / `read` |
| `getSelectionRecordIds` | `dp_Selections` / `read` |
| `getUserTools` | `dp_Tools` / `read` |
| `listPages` | `dp_Pages` / `read` |
| `listRoles` | `dp_Roles` / `read` |
| `deployTool` | `dp_Tools` / `create` |
| `resolveContactIds` | `Contacts` / `read` (plus `dp_Pages` via `getPageData`) |

## Singleton
```typescript
// src/services/toolService.ts:84-118
export class ToolService {
  private static instance: ToolService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<ToolService> {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
      await ToolService.instance.initialize();
    }
    return ToolService.instance;
  }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## API

| Method | Returns | Calls |
|--------|---------|-------|
| `getPageData(pageID: number)` | `PageData \| null` | SP `api_Tools_GetPageData` |
| `getSelectionRecordIds(selectionId, pageId)` | `number[]` | SP `api_Common_GetSelection` (`@UserID` from the gate) |
| `getUserTools()` | `string[]` (tool paths) | SP `api_Tools_GetUserTools` (`@UserId` from the gate) |
| `resolveContactIds(pageId, recordIds)` | `ContactRecordResult \| null` | `getPageData(pageId)`, then `getTableRecords` on the page's table in batches of 100 |
| `listPages(search?: string)` | `PageLookup[]` (max 100) | SP `api_MPNextTools_GetPages`, filtered in-memory |
| `listRoles(search?: string)` | `RoleLookup[]` (max 100) | `getTableRecords('dp_Roles')` |
| `deployTool(input: DeployToolInput)` | `DeployToolResult` | SP `api_dev_DeployTool` (dev credentials) |

## getPageData

```typescript
// src/services/toolService.ts:126-148
const result = await this.mp!.executeProcedureWithBody('api_Tools_GetPageData', {
  "@PageID": pageID
});
if (result && result.length > 0 && result[0].length > 0) {
  return result[0][0] as PageData;
}
return null;
```

- SP: `api_Tools_GetPageData(@PageID INT)` — see `../mp-schema/required-procs.md`
- DomainID is auto-injected by MP API
- Result shape: nested `[[row]]` — `result[0][0]` extracts first row of first set

## getSelectionRecordIds

```typescript
// src/services/toolService.ts:162-188
const userId = await AuthorizationService.getInstance().requireSecurityRole({
  table: 'dp_Selections',
  operation: 'read',
});
const result = await this.mp!.executeProcedureWithBody('api_Common_GetSelection', {
  '@SelectionID': selectionId,
  '@UserID': userId,
  '@PageID': pageId,
});
// Find the result set containing Record_ID
if (result && result.length > 0) {
  for (const resultSet of result) {
    if (Array.isArray(resultSet) && resultSet.length > 0 && typeof resultSet[0] === 'object' && resultSet[0] !== null && 'Record_ID' in resultSet[0]) {
      return (resultSet as Array<{ Record_ID: number }>).map((r) => r.Record_ID);
    }
  }
}
return [];
```

- Some procs return metadata in set 0 and records later; the scan picks whichever set contains `Record_ID`.
- `@UserID` is the gate's return value, never a caller argument: a selection belongs to a specific MP user, so accepting a user ID from the payload would let any caller read someone else's selection.

## getUserTools

```typescript
// src/services/toolService.ts:196-215
const userId = await AuthorizationService.getInstance().requireSecurityRole({
  table: 'dp_Tools',
  operation: 'read',
});
const result = await this.mp!.executeProcedureWithBody('api_Tools_GetUserTools', {
  "@UserId": userId
});
if (result && result.length > 0 && result[0].length > 0) {
  return (result[0] as Array<{ Tool_Path: string }>).map((row) => row.Tool_Path);
}
return [];
```

- Takes no arguments: the numeric `User_ID` comes from `requireSecurityRole`, which resolves `session.user.userGuid` → `dp_Users.User_ID`

## resolveContactIds

Resolves record IDs on an MP page (a single record or a selection) to their associated Contact IDs. Works for direct Contact_ID columns AND FK traversal paths like `Participant_ID_Table.Contact_ID`.

Takes a **page ID, not table/column names**. The page's `Table_Name`, `Primary_Key` and `Contact_ID_Field` are looked up server-side through `getPageData(pageId)` and validated before interpolation, so no caller chooses what the service account reads. `FamilyService.resolveContactIdFromPage` gets the same treatment from its action.

```typescript
// src/services/toolService.ts — resolveContactIds
public async resolveContactIds(
  pageId: number, recordIds: number[]
): Promise<ContactRecordResult | null> {
  validatePositiveInt(pageId, 'pageId');
  await AuthorizationService.getInstance().requireSecurityRole({ table: 'Contacts', operation: 'read' });

  const page = await this.getPageData(pageId);
  if (!page?.Table_Name || !page.Primary_Key || !page.Contact_ID_Field?.trim()) return null;

  const tableName = validateColumnName(page.Table_Name);
  const primaryKey = validateColumnName(page.Primary_Key);
  const contactIdField = validateFkPath(page.Contact_ID_Field.trim(), 'Contact_ID_Field');
  // ...short-circuit when contactIdField === primaryKey, else
  // getTableRecords in batches of MP_FETCH_BATCH_SIZE (100)
}
```

- **Returns `null`** when the page is unknown or lacks `Table_Name` / `Primary_Key` / `Contact_ID_Field`.
- **Short-circuits** when the table's PK *is* Contact_ID (e.g., `Contacts` table).
- **Batches** at 100 IDs per request.
- **Validates** `pageId`, `Table_Name` and `Primary_Key` (`validateColumnName`), `Contact_ID_Field` (`validateFkPath` — no extra columns, aliases, or non-`_TABLE` segments), and every record ID.

**Return type:**
```typescript
// src/services/toolService.ts:8-18
export interface ContactRecord { recordId: number; contactId: number; }
export interface ContactRecordResult {
  tableName: string;
  primaryKey: string;
  contactIdField: string;
  records: ContactRecord[];
}
```

## listPages / listRoles (deploy-tool pickers)

```typescript
// src/services/toolService.ts:223-241
public async listPages(search?: string): Promise<PageLookup[]> {
  await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Pages', operation: 'read' });
  const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPages', {});
  const rows = (result?.[0] as PageLookup[] | undefined) ?? [];
  const term = search?.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) =>
        r.Display_Name?.toLowerCase().includes(term) ||
        r.Table_Name?.toLowerCase().includes(term))
    : rows;
  return filtered.slice(0, 100);
}
```
- Reuses `api_MPNextTools_GetPages` (also used by `FieldManagementService.getPages`); SP has no search param so filter happens in-memory.

```typescript
// src/services/toolService.ts:247-264
public async listRoles(search?: string): Promise<RoleLookup[]> {
  await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Roles', operation: 'read' });
  const term = search?.trim();
  const filter = term
    ? `Role_Name LIKE '%${escapeFilterString(term)}%'`
    : undefined;
  return this.mp!.getTableRecords<RoleLookup>({
    table: 'dp_Roles',
    select: 'Role_ID, Role_Name',
    filter,
    orderBy: 'Role_Name',
    top: 100,
  });
}
```
- Escaped with `escapeFilterString` (`src/lib/validation.ts`): bracket-escapes `[`, `%`, `_` and doubles `'`, so user input matches literally inside the outer `'%…%'`.

## deployTool (localhost-only dev feature)

```typescript
// src/services/toolService.ts:272-310
public async deployTool(input: DeployToolInput): Promise<DeployToolResult> {
  const $userId = await AuthorizationService.getInstance().requireSecurityRole({
    table: 'dp_Tools',
    operation: 'create',
  });
  // Pre-flight validation
  if (!input.toolName.trim()) throw new Error('Tool Name is required');
  if (!input.launchPage.trim()) throw new Error('Launch Page is required');
  if (input.toolName.length > 30) throw new Error('Tool Name must be 30 characters or fewer');
  if (input.description && input.description.length > 100) throw new Error('Description must be 100 characters or fewer');
  if (input.launchPage.length > 1024) throw new Error('Launch Page must be 1024 characters or fewer');
  if (input.additionalData && input.additionalData.length > 65) throw new Error('Additional Data must be 65 characters or fewer');

  const payload: Record<string, unknown> = {
    '@ToolName': input.toolName.trim(),
    '@LaunchPage': input.launchPage.trim(),
    '@Description': input.description?.trim() || null,
    '@LaunchWithCredentials': input.launchWithCredentials ? 1 : 0,
    '@LaunchWithParameters': input.launchWithParameters ? 1 : 0,
    '@LaunchInNewTab': input.launchInNewTab ? 1 : 0,
    '@ShowOnMobile': input.showOnMobile ? 1 : 0,
    '@PageIDs': input.pageIds.length ? input.pageIds.join(',') : null,
    '@AdditionalData': input.additionalData?.trim() || null,
    '@RoleIDs': input.roleIds.length ? input.roleIds.join(',') : null,
  };

  const resultSets = await this.mp!.executeProcedureWithBody('api_dev_DeployTool', payload, { $userId });
  const [toolRows, pageRows, roleRows] = resultSets ?? [];
  const tool = (toolRows?.[0] as DeployedToolRow | undefined);
  if (!tool) {
    throw new Error('Deploy did not return a tool row — check stored procedure permissions and dev credentials.');
  }
  return {
    tool,
    pages: (pageRows as DeployedToolPageRow[] | undefined) ?? [],
    roles: (roleRows as DeployedToolRoleRow[] | undefined) ?? [],
  };
}
```

- SP name prefix `api_dev_` → MP provider switches to `MINISTRY_PLATFORM_DEV_*` client credentials
- Returns 3 result sets: tool row, page rows, role rows
- Booleans encoded as `1`/`0` (BIT), empty arrays as `null`
- `$userId` (audit attribution) comes only from the gate's return value — `deployToolAction` passes no user ID

## Stored procedures called

| Service method | SP | Doc |
|----------------|------|-----|
| `getPageData` | `api_Tools_GetPageData` | `../mp-schema/required-procs.md#api_Tools_GetPageData` |
| `getSelectionRecordIds` | `api_Common_GetSelection` | `../mp-schema/required-procs.md#api_Common_GetSelection` |
| `getUserTools` | `api_Tools_GetUserTools` | `../mp-schema/required-procs.md#api_Tools_GetUserTools` |
| `listPages` | `api_MPNextTools_GetPages` | see `field-management-service.md` |
| `deployTool` | `api_dev_DeployTool` | — |

## Consumers (server actions)

| Action | File | Method(s) used |
|--------|------|----------------|
| `fetchAddressLabels` | `src/components/address-labels/actions.ts` | `getSelectionRecordIds` |
| `parseToolParams` | `src/lib/tool-params.server.ts` | `getPageData` (dynamic import) |
| `resolveContactIdFromPage` | `src/app/(web)/tools/addeditfamily/actions.ts` | `getPageData` |
| `resolveSelection` | `src/components/dev-panel/panels/selection-actions.ts` | `getSelectionRecordIds` |
| `getUserTools` | `src/components/dev-panel/panels/user-tools-actions.ts` | `getUserTools` |
| `resolveContactRecords` | `src/components/dev-panel/panels/contact-records-actions.ts` | `resolveContactIds` |
| `listPagesAction`, `listRolesAction`, `deployToolAction` | `src/components/dev-panel/panels/deploy-tool-actions.ts` | `listPages`, `listRoles`, `deployTool` |

## Related docs
- `query-patterns.md` — shared query rules (validation, batching, quote escaping)
- `../mp-schema/required-procs.md` — SP parameter/return details
- `../components/dev-panel.md` — consuming UI

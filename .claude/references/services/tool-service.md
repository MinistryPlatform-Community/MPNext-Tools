---
title: ToolService
domain: services
type: reference
applies_to: [src/services/toolService.ts, src/services/toolService.test.ts]
symbols: [ToolService, ContactRecord, ContactRecordResult, PageLookup, RoleLookup, DeployToolInput, DeployToolResult]
related: [query-patterns.md, ../mp-schema/required-procs.md, ../components/dev-panel.md]
last_verified: 2026-04-17
---

## Purpose
Resolves MP page metadata, user tool authorization, selection record IDs, and contact-ID mappings. Also backs the localhost-only dev-tool deployer.

## Files
- `src/services/toolService.ts` — singleton implementation
- `src/services/toolService.test.ts` — 549 lines; covers every public method including error paths, batching, and `deployTool` payload shaping

## Singleton
```typescript
// src/services/toolService.ts:81-115
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
| `getSelectionRecordIds(selectionId, userId, pageId)` | `number[]` | SP `api_Common_GetSelection` |
| `getUserTools(userId: number)` | `string[]` (tool paths) | SP `api_Tools_GetUserTools` |
| `resolveContactIds(tableName, primaryKey, contactIdField, recordIds)` | `ContactRecordResult` | `getTableRecords` on `{tableName}` in batches of 100 |
| `listPages(search?: string)` | `PageLookup[]` (max 100) | SP `api_MPNextTools_GetPages`, filtered in-memory |
| `listRoles(search?: string)` | `RoleLookup[]` (max 100) | `getTableRecords('dp_Roles')` |
| `deployTool(input: DeployToolInput)` | `DeployToolResult` | SP `api_dev_DeployTool` (dev credentials) |

## getPageData

```typescript
// src/services/toolService.ts:123-141
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
// src/services/toolService.ts:152-174
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

## getUserTools

```typescript
// src/services/toolService.ts:183-198
const result = await this.mp!.executeProcedureWithBody('api_Tools_GetUserTools', {
  "@UserId": userId
});
if (result && result.length > 0 && result[0].length > 0) {
  return (result[0] as Array<{ Tool_Path: string }>).map((row) => row.Tool_Path);
}
return [];
```

- Caller must already have resolved numeric `User_ID` from `session.user.userGuid` (typically via `UserService.getUserIdByGuid`)

## resolveContactIds

Resolves record IDs (from a selection) to their associated Contact IDs. Works for direct Contact_ID columns AND FK traversal paths like `Participant_ID_Table.Contact_ID`.

```typescript
// src/services/toolService.ts:299-350
public async resolveContactIds(
  tableName: string, primaryKey: string, contactIdField: string, recordIds: number[]
): Promise<ContactRecordResult> {
  const envelope = { tableName, primaryKey, contactIdField };

  validateColumnName(primaryKey);
  validateColumnName(tableName);
  if (contactIdField.includes('.')) {
    contactIdField.split('.').forEach(validateColumnName);
  } else {
    validateColumnName(contactIdField);
  }

  if (recordIds.length === 0) return { ...envelope, records: [] };

  if (contactIdField === primaryKey) {
    // e.g., Contacts table — PK IS the contact ID
    return {
      ...envelope,
      records: recordIds.map(id => ({ recordId: id, contactId: id })),
    };
  }

  const contactIdResponseKey = contactIdField.includes('.')
    ? contactIdField.split('.').pop()!
    : contactIdField;

  const allRecords: ContactRecord[] = [];
  for (let i = 0; i < recordIds.length; i += ToolService.BATCH_SIZE) {
    const batch = recordIds.slice(i, i + ToolService.BATCH_SIZE);
    batch.forEach(validatePositiveInt);
    const rows = await this.mp!.getTableRecords<Record<string, number>>({
      table: tableName,
      select: `${primaryKey}, ${contactIdField}`,
      filter: `${primaryKey} IN (${batch.join(',')})`,
    });
    for (const row of rows) {
      allRecords.push({
        recordId: row[primaryKey],
        contactId: row[contactIdResponseKey],
      });
    }
  }

  return { ...envelope, records: allRecords };
}
```

- **Short-circuits** when the table's PK *is* Contact_ID (e.g., `Contacts` table).
- **Batches** at 100 IDs per request.
- **Validates** `tableName`, `primaryKey`, every segment of `contactIdField`, and every record ID.

**Return type:**
```typescript
// src/services/toolService.ts:5-15
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
// src/services/toolService.ts:206-220
public async listPages(search?: string): Promise<PageLookup[]> {
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
// src/services/toolService.ts:226-239
public async listRoles(search?: string): Promise<RoleLookup[]> {
  const term = search?.trim();
  const filter = term
    ? `Role_Name LIKE '%${term.replace(/'/g, "''")}%'`
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
- Inline single-quote escape (no `%`/`_` allowed in the wildcard position since the wildcards are at the outer `'%{term}%'`).

## deployTool (localhost-only dev feature)

```typescript
// src/services/toolService.ts:247-281
public async deployTool(input: DeployToolInput): Promise<DeployToolResult> {
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

  const resultSets = await this.mp!.executeProcedureWithBody('api_dev_DeployTool', payload);
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
| `fetchAddressLabels` | `src/components/address-labels/actions.ts` | `getPageData`, `getSelectionRecordIds` |
| `resolveSelection` | `src/components/dev-panel/panels/selection-actions.ts` | `getSelectionRecordIds` |
| `getUserTools` | `src/components/dev-panel/panels/user-tools-actions.ts` | `getUserTools` |
| Deploy tool panel | `src/components/dev-panel/panels/deploy-tool-actions.ts` | `listPages`, `listRoles`, `deployTool` |

## Related docs
- `query-patterns.md` — shared query rules (validation, batching, quote escaping)
- `../mp-schema/required-procs.md` — SP parameter/return details
- `../components/dev-panel.md` — consuming UI

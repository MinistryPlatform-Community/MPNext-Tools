---
title: FieldManagementService
domain: services
type: reference
applies_to: [src/services/fieldManagementService.ts, src/services/fieldManagementService.test.ts]
symbols: [FieldManagementService, PageListItem, PageField]
related: [query-patterns.md, ../mp-schema/required-procs.md, ../components/field-management.md]
last_verified: 2026-10-10
---

## Purpose
Reads MP page list, `dp_Page_Fields` rows and table metadata for the drag-and-drop field editor (the `fetchPageFieldData` action merges metadata columns in to surface unsaved fields), and persists reorders via `api_MPNextTools_UpdatePageFieldOrder` (concurrency-capped at 5).

## Files
- `src/services/fieldManagementService.ts` — 134 lines
- `src/services/fieldManagementService.test.ts` — 303 lines

## Authorization
Every method calls `AuthorizationService.getInstance().requireSecurityRole(...)` first (see `../security/README.md`). `updatePageFieldOrder` is a **domain-wide** configuration write (changes page layout for every MP user), and takes `$userId` from the gate's return value.

| Method | Gate `table` / `operation` |
|--------|---------------------------|
| `getPages` | `dp_Pages` / `read` |
| `getPageFields` | `dp_Page_Fields` / `read` |
| `getTableMetadata` | `dp_Tables` / `read` |
| `updatePageFieldOrder` | `dp_Page_Fields` / `update` |

## Singleton
```typescript
// src/services/fieldManagementService.ts:27-43
export class FieldManagementService {
  private static instance: FieldManagementService;
  private mp: MPHelper | null = null;
  private constructor() {}
  public static async getInstance(): Promise<FieldManagementService> { ... }
  private async initialize(): Promise<void> { this.mp = new MPHelper(); }
}
```

## API

| Method | Returns | Calls |
|--------|---------|-------|
| `getPages()` | `PageListItem[]` | SP `api_MPNextTools_GetPages` |
| `getPageFields(pageId)` | `PageField[]` | SP `api_MPNextTools_GetPageFields` |
| `getTableMetadata(tableName)` | `TableMetadata \| null` | `mp.getTables(tableName)` — exact `Name` match only, else `null` |
| `updatePageFieldOrder(fields[])` | `void` | SP `api_MPNextTools_UpdatePageFieldOrder` per field (batches of 5 via `Promise.all`), `$userId` from gate |

## Types

```typescript
// src/services/fieldManagementService.ts:6-25
export interface PageListItem {
  Page_ID: number;
  Display_Name: string;
  Table_Name: string;
}

export interface PageField {
  Page_Field_ID: number;
  Page_ID: number;
  Field_Name: string;
  Group_Name: string | null;
  View_Order: number;
  Required: boolean;
  Hidden: boolean;
  Default_Value: string | null;
  Filter_Clause: string | null;
  Depends_On_Field: string | null;
  Field_Label: string | null;
  Writing_Assistant_Enabled: boolean;
}
```

## getPages

```typescript
// src/services/fieldManagementService.ts:45-57 (gate call omitted)
public async getPages(): Promise<PageListItem[]> {
  const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPages', {});
  if (result && result.length > 0 && result[0].length > 0) {
    return result[0] as PageListItem[];
  }
  return [];
}
```

Same SP also used by `ToolService.listPages` (which wraps it with in-memory search + 100-row cap).

## getPageFields

```typescript
// src/services/fieldManagementService.ts:59-73 (gate call omitted)
public async getPageFields(pageId: number): Promise<PageField[]> {
  const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPageFields', {
    "@PageID": pageId,
  });
  if (result && result.length > 0 && result[0].length > 0) {
    return result[0] as PageField[];
  }
  return [];
}
```

## getTableMetadata

```typescript
// src/services/fieldManagementService.ts:75-88 (gate call and comment omitted)
public async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
  const tables = await this.mp!.getTables(tableName);
  return tables.find((t) => t.Name === tableName) ?? null;
}
```

`mp.getTables()` delegates to MP's `GET /tables?$search=`, which can return several tables. Each entry's name is under **`Name`** — a live `/tables?$search=Contacts` response (2026-10-11) carried exactly `Name`, `AccessLevel`, `SpecialPermissions`, `Columns` per entry; there is no `Table_Name`. The match is exact and case-sensitive (the page's `Table_Name` and the `/tables` `Name` both come from MP's own table metadata, so they agree verbatim).

There is **no fallback to `tables[0]`**: a near-miss would merge another table's columns into this page's layout. With no exact match it returns `null`, which `fetchPageFieldData` already handles — it merges no extra columns and tags no separators, so the editor shows only the page's existing `dp_Page_Fields` rows.

## updatePageFieldOrder — concurrency-capped

```typescript
// src/services/fieldManagementService.ts:88-133
private static readonly CONCURRENCY = 5;

public async updatePageFieldOrder(
  fields: {
    Page_ID: number;
    Field_Name: string;
    Group_Name: string | null;
    View_Order: number;
    Required: boolean;
    Hidden: boolean;
    Default_Value: string | null;
    Filter_Clause: string | null;
    Depends_On_Field: string | null;
    Field_Label: string | null;
    Writing_Assistant_Enabled: boolean;
  }[]
): Promise<void> {
  const $userId = await AuthorizationService.getInstance().requireSecurityRole({
    table: "dp_Page_Fields",
    operation: "update",
  });
  const queryParams = { $userId };

  for (let i = 0; i < fields.length; i += FieldManagementService.CONCURRENCY) {
    const batch = fields.slice(i, i + FieldManagementService.CONCURRENCY);
    await Promise.all(batch.map((f) =>
      this.mp!.executeProcedureWithBody('api_MPNextTools_UpdatePageFieldOrder', {
        "@PageID": f.Page_ID,
        "@FieldName": f.Field_Name,
        "@GroupName": f.Group_Name,
        "@ViewOrder": f.View_Order,
        "@Required": f.Required,
        "@Hidden": f.Hidden,
        "@DefaultValue": f.Default_Value,
        "@FilterClause": f.Filter_Clause,
        "@DependsOnField": f.Depends_On_Field,
        "@FieldLabel": f.Field_Label,
        "@WritingAssistantEnabled": f.Writing_Assistant_Enabled,
      }, queryParams)
    ));
  }
}
```

- One SP call per field, 5 parallel calls per batch, each carrying `$userId` for MP audit.
- Not atomic — partial failures leave some fields updated, others not. The server action wraps in try/catch and surfaces an error to the UI.

## Stored procedures

| SP | Called by | Params |
|----|-----------|--------|
| `api_MPNextTools_GetPages` | `getPages` | none |
| `api_MPNextTools_GetPageFields` | `getPageFields` | `@PageID INT` |
| `api_MPNextTools_UpdatePageFieldOrder` | `updatePageFieldOrder` (1-per-field) | `@PageID, @FieldName, @GroupName, @ViewOrder, @Required, @Hidden, @DefaultValue, @FilterClause, @DependsOnField, @FieldLabel, @WritingAssistantEnabled` |

Each SP declares `@DomainID INT` as its first parameter (auto-injected by MP API — see MP install scripts in `src/lib/providers/ministry-platform/db/`).

See `../mp-schema/required-procs.md` for full parameter/return docs.

## Consumers

| Action | File |
|--------|------|
| `fetchPages` | `src/components/field-management/actions.ts` — gate `dp_Pages`/`read` |
| `fetchPageFieldData` | `src/components/field-management/actions.ts` (parallels `getPageFields` + `getTableMetadata`, merges unsaved rows with negative `Page_Field_ID` values) |
| `savePageFieldOrder` | `src/components/field-management/actions.ts` — gate `dp_Page_Fields`/`update`, wraps `updatePageFieldOrder` in try/catch |

## Gotchas
- `updatePageFieldOrder` is not transactional. A mid-batch failure leaves `dp_Page_Fields` partially updated.
- `getTableMetadata` matches on `Name`, not `Table_Name` — `/tables` entries have no `Table_Name` key (the `PageListItem.Table_Name` from `dp_Pages` is a different shape). No exact match → `null`, never the first search result.
- `getPages` shape is `result[0]` — not `result[0][0]`. Different from `getPageData` in ToolService (which returns a single row).

## Related docs
- `query-patterns.md` — shared conventions
- `../mp-schema/required-procs.md` — SP docs
- `../components/field-management.md` — consuming UI (merges unsaved fields, negative Page_Field_ID)

---
title: FieldManagementService
domain: services
type: reference
applies_to: [src/services/fieldManagementService.ts, src/services/fieldManagementService.test.ts]
symbols: [FieldManagementService, PageListItem, PageField]
related: [query-patterns.md, ../mp-schema/required-procs.md, ../components/field-management.md]
last_verified: 2026-04-17
---

## Purpose
Reads MP page list + `dp_Page_Fields` rows for the drag-and-drop field editor, merges in table-metadata columns to surface unsaved fields, and persists reorders via `api_MPNextTools_UpdatePageFieldOrder` (concurrency-capped at 5).

## Files
- `src/services/fieldManagementService.ts` — 110 lines
- `src/services/fieldManagementService.test.ts` — 254 lines

## Singleton
```typescript
// src/services/fieldManagementService.ts:25-41
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
| `getTableMetadata(tableName)` | `TableMetadata \| null` | `mp.getTables(tableName)` — exact-match preferred |
| `updatePageFieldOrder(fields[])` | `void` | SP `api_MPNextTools_UpdatePageFieldOrder` per field (batches of 5 via `Promise.all`) |

## Types

```typescript
// src/services/fieldManagementService.ts:4-23
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
// src/services/fieldManagementService.ts:43-51
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
// src/services/fieldManagementService.ts:53-63
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
// src/services/fieldManagementService.ts:65-72
public async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
  const tables = await this.mp!.getTables(tableName);
  if (tables.length === 0) return null;
  // getTables with search may return multiple matches — find the exact one
  return tables.find((t) => t.Table_Name === tableName) ?? tables[0];
}
```

`mp.getTables()` delegates to MP's metadata endpoint; `search` is a LIKE-style param so a prefix match may return multiple tables.

## updatePageFieldOrder — concurrency-capped

```typescript
// src/services/fieldManagementService.ts:74-109
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
      })
    ));
  }
}
```

- One SP call per field, 5 parallel calls per batch.
- Not atomic — partial failures leave some fields updated, others not. The server action wraps in try/catch and surfaces an error to the UI.

## Stored procedures

| SP | Called by | Params |
|----|-----------|--------|
| `api_MPNextTools_GetPages` | `getPages` | none |
| `api_MPNextTools_GetPageFields` | `getPageFields` | `@PageID INT` |
| `api_MPNextTools_UpdatePageFieldOrder` | `updatePageFieldOrder` (1-per-field) | `@PageID, @FieldName, @GroupName, @ViewOrder, @Required, @Hidden, @DefaultValue, @FilterClause, @DependsOnField, @FieldLabel, @WritingAssistantEnabled` |

Each SP accepts `@DomainID INT` as the implicit first parameter (auto-injected by MP API — see MP install scripts in `src/lib/providers/ministry-platform/db/`).

See `../mp-schema/required-procs.md` for full parameter/return docs.

## Consumers

| Action | File |
|--------|------|
| `fetchPages` | `src/components/field-management/actions.ts` |
| `fetchPageFieldData` | `src/components/field-management/actions.ts` (parallels `getPageFields` + `getTableMetadata`, merges unsaved rows with negative `Page_Field_ID` values) |
| `savePageFieldOrder` | `src/components/field-management/actions.ts` — wraps `updatePageFieldOrder` in try/catch |

## Gotchas
- `updatePageFieldOrder` is not transactional. A mid-batch failure leaves `dp_Page_Fields` partially updated.
- `getTableMetadata` falls back to `tables[0]` when there's no exact `Table_Name` match — this can misbehave if MP returns a prefix-matching unrelated table. Exact match is preferred; the caller assumes this is usually right.
- `getPages` shape is `result[0]` — not `result[0][0]`. Different from `getPageData` in ToolService (which returns a single row).

## Related docs
- `query-patterns.md` — shared conventions
- `../mp-schema/required-procs.md` — SP docs
- `../components/field-management.md` — consuming UI (merges unsaved fields, negative Page_Field_ID)

---
title: MetadataService — Schema Discovery & Cache Refresh
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/metadata.service.ts]
symbols: [MetadataService, getTables, refreshMetadata]
related: [../README.md, table.md, ../../ministryplatform.schema.md]
last_verified: 2026-04-17
---

## Purpose
Discover MP tables available to the current user, and invalidate the MP metadata cache after schema changes.

## Files
- `src/lib/providers/ministry-platform/services/metadata.service.ts` — implementation (39 lines, smallest service)
- `src/lib/providers/ministry-platform/services/metadata.service.test.ts` — tests (102 lines)

## Key concepts
- `refreshMetadata` is a `GET /refreshMetadata` (no body) — MP uses this to trigger cache invalidation across all servers.
- `getTables` is an authenticated list endpoint; an optional `search` string filters server-side via `?$search=`.
- Empty-string search is coerced to "no search" — `!search` check drops it (`metadata.service.ts:32`, verified by `metadata.service.test.ts:75-81`).
- Result type `TableMetadata[]` is a loose shape with optional `Columns?: ColumnMetadata[]` — real endpoint returns only basic table info unless columns are expanded.

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/metadata.service.ts`:

```typescript
public async refreshMetadata(): Promise<void>

public async getTables(search?: string): Promise<TableMetadata[]>
```

### Endpoint → method map

| Method | HTTP | Endpoint |
|---|---|---|
| `refreshMetadata` | GET | `/refreshMetadata` |
| `getTables` | GET | `/tables` (optional `?$search=<term>`) |

### Type shape

From `src/lib/providers/ministry-platform/types/provider.types.ts:265`:

```typescript
export interface TableMetadata {
  Table_ID: number;
  Table_Name: string;
  Display_Name: string;
  Description?: string;
  Columns?: ColumnMetadata[];
  [key: string]: unknown;
}

// :274
export interface ColumnMetadata {
  Name: string;
  DataType: ParameterDataType;
  IsRequired: boolean;
  Size: number;
  IsPrimaryKey?: boolean;
  IsForeignKey?: boolean;
  ReferencedTable?: string;
  ReferencedColumn?: string;
  IsReadOnly?: boolean;
  IsComputed?: boolean;
  HasDefault?: boolean;
}
```

## How it works
- Both methods call `ensureValidToken()` first.
- `getTables('')` → falsy → `params = undefined` (no `$search` sent).
- `getTables('contact')` → `params = { $search: 'contact' }`.
- Errors from `HttpClient` propagate after `logger.error`.

## Usage

Only caller in the app is `FieldManagementService.getTableMetadata` (`src/services/fieldManagementService.ts:65-72`):

```typescript
public async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
  const tables = await this.mp!.getTables(tableName);

  if (tables.length === 0) return null;

  // getTables with search may return multiple matches — find the exact one
  return tables.find((t) => t.Table_Name === tableName) ?? tables[0];
}
```

Note the consumer guard: MP `$search` is substring-match, so callers must filter for exact name. `getTables('Contacts')` can return `Contact_Addresses`, `Contact_Log`, etc.

## Error handling

| Status | Operation | Test location |
|---|---|---|
| 403 Forbidden | `getTables` | `metadata.service.test.ts:83-87` |
| 500 Internal Server Error | `refreshMetadata` | `metadata.service.test.ts:46-50` |

## Gotchas
- **`$search` is substring-match** — always post-filter on `Table_Name === exact` if you need the exact table. Pattern used by `FieldManagementService`.
- **`refreshMetadata` has no return data** — it's fire-and-forget. Uses `GET` (not `POST`) even though it has side effects.
- **No `Columns` populated by default** — generic `getTables` call returns a list without the `Columns` array. To get column-level metadata in this codebase, generate types via `npm run mp:generate:models` (see CLAUDE.md).

## Related docs
- `../README.md` — provider overview
- `table.md` — uses names discovered here as the `table` argument
- `../../ministryplatform.schema.md` — auto-generated schema dump (authoritative at build time)

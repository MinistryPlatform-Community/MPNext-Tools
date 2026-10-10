---
title: MetadataService — Schema Discovery & Cache Refresh
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/metadata.service.ts]
symbols: [MetadataService, getTables, refreshMetadata]
related: [../README.md, table.md, ../../mp-schema/tables.md]
last_verified: 2026-10-10
---

## Purpose
Discover MP tables available to the current user, and invalidate the MP metadata cache after schema changes.

## Files
- `src/lib/providers/ministry-platform/services/metadata.service.ts` — implementation (38 lines, smallest service)
- `src/lib/providers/ministry-platform/services/metadata.service.test.ts` — tests (113 lines)

## Key concepts
- `refreshMetadata` is a `GET /refreshMetadata` (no body) — MP uses this to trigger cache invalidation across all servers.
- `getTables` is an authenticated list endpoint; an optional `search` string filters server-side via `?$search=`.
- Empty-string search is coerced to "no search" — `!search` check drops it (`metadata.service.ts:32`, verified by `metadata.service.test.ts:87-93`).
- Result type `TableMetadata[]` is a loose shape with optional `Columns?: ColumnMetadata[]` and an index signature. `generate-types.ts` builds every model from these `Columns`, and reads the name as `Name ?? Table_Name` (`generate-types.ts:141-145` — its comment says the API returns `Name`, not the typed `Table_Name`).

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

From `src/lib/providers/ministry-platform/types/provider.types.ts:264`:

```typescript
export interface TableMetadata {
  Table_ID: number;
  Table_Name: string;
  Display_Name: string;
  Description?: string;
  Columns?: ColumnMetadata[];
  [key: string]: unknown;
}

// :273
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
- Errors from `HttpClient` propagate after `logger.error(event, { error: errorName(e) })`.

## Usage

Only caller in the app is `FieldManagementService.getTableMetadata` (`src/services/fieldManagementService.ts:75-86`):

```typescript
public async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
  await AuthorizationService.getInstance().requireSecurityRole({
    table: "dp_Tables",
    operation: "read",
  });
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
| 403 Forbidden | `getTables` | `metadata.service.test.ts:95-99` |
| 500 Internal Server Error | `refreshMetadata` | `metadata.service.test.ts:58-62` |

## Gotchas
- **`$search` is substring-match** — always post-filter on `Table_Name === exact` if you need the exact table. Pattern used by `FieldManagementService`.
- **`refreshMetadata` has no return data** — it's fire-and-forget. Uses `GET` (not `POST`) even though it has side effects.
- **`Columns` come back on the list call** — `generate-types.ts` relies on them (it only falls back to record sampling under `--detailed` when a table has none). For committed column-level types, use the generated models (`npm run mp:generate:models`).

## Related docs
- `../README.md` — provider overview
- `table.md` — uses names discovered here as the `table` argument
- `../../mp-schema/tables.md` — generated table catalog (snapshot)

---
title: TableService — CRUD on MP Tables
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/table.service.ts]
symbols: [TableService, getTableRecords, createTableRecords, updateTableRecords, deleteTableRecords, copyRecord, copyRecordWithSubpages]
related: [../README.md, procedure.md, file.md, ../../services/README.md]
last_verified: 2026-04-17
---

## Purpose
HTTP-level wrapper around the Ministry Platform REST `/tables/{table}` endpoints. Stateless; each method calls `client.ensureValidToken()` then the underlying `HttpClient` verb. No validation at this layer — Zod `schema` validation lives one level up in `MPHelper` (see Gotchas).

## Files
- `src/lib/providers/ministry-platform/services/table.service.ts` — implementation (150 lines)
- `src/lib/providers/ministry-platform/services/table.service.test.ts` — tests (519 lines)

## Key concepts
- Constructor takes a `MinistryPlatformClient`; no singleton.
- Every method: `ensureValidToken()` → `getHttpClient().{verb}()` → return typed result.
- `TableQueryParams` include `$select`, `$filter`, `$orderby`, `$groupby`, `$having`, `$top`, `$skip`, `$distinct`, `$userId`, `$globalFilterId`, `$allowCreate` (see `src/lib/providers/ministry-platform/types/provider.types.ts:1`).
- Table name is URL-encoded via `encodeURIComponent()` on every endpoint (`table.service.ts:22`, `:44`, `:63`, `:87`, `:116`, `:142`).
- **Partial vs full updates** are not parameters on `TableService` — they are a `MPHelper.updateTableRecords` concern (`partial: boolean`, default `true`; see `src/lib/providers/ministry-platform/helper.ts:266-267`).
- **`schema` (Zod validation)** is also not a `TableService` parameter — it is a `MPHelper` concern (`src/lib/providers/ministry-platform/helper.ts:175`, `:256`). `TableService` itself does not validate.

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/table.service.ts`:

```typescript
public async getTableRecords<T>(table: string, params?: TableQueryParams): Promise<T[]>

public async createTableRecords<T extends TableRecord = TableRecord>(
    table: string,
    records: T[],
    params?: Pick<TableQueryParams, '$select' | '$userId'>
): Promise<T[]>

public async updateTableRecords<T extends TableRecord = TableRecord>(
    table: string,
    records: T[],
    params?: Pick<TableQueryParams, '$select' | '$userId' | '$allowCreate'>
): Promise<T[]>

public async copyRecord<T extends TableRecord = TableRecord>(
    table: string,
    recordId: number,
    pattern: RecurrencePattern,
    params?: Pick<TableQueryParams, '$select' | '$userId'>
): Promise<T[]>

public async copyRecordWithSubpages<T extends TableRecord = TableRecord>(
    table: string,
    recordId: number,
    copyParams: CopyParameters,
    params?: Pick<TableQueryParams, '$select' | '$userId'>
): Promise<T[]>

public async deleteTableRecords<T extends TableRecord = TableRecord>(
    table: string,
    ids: number[],
    params?: Pick<TableQueryParams, '$select' | '$userId'>
): Promise<T[]>
```

### Endpoint → method map

| Method | HTTP | Endpoint |
|---|---|---|
| `getTableRecords` | GET | `/tables/{table}` |
| `createTableRecords` | POST | `/tables/{table}` |
| `updateTableRecords` | PUT | `/tables/{table}` |
| `copyRecord` | POST | `/tables/{table}/{recordId}/copy` |
| `copyRecordWithSubpages` | POST | `/tables/{table}/{recordId}/copy-record` |
| `deleteTableRecords` | DELETE | `/tables/{table}` (ids merged into query as `id: number[]`) |

## How it works
- `deleteTableRecords` merges `ids` into query params as `id: [1, 2, 3]` (`table.service.ts:141`), not in the body.
- `createTableRecords` / `updateTableRecords` pass `records` array as the body and `params` as query string.
- `copyRecord` does NOT copy sub-pages or files; `copyRecordWithSubpages` can via `CopyParameters.SubpageIds` and `CopyParameters.CopyFiles`. Both create `dp_Sequences` entries for native MP series linkage (`table.service.ts:73-77`, `:100-105`).
- `RecurrencePattern` and `CopyParameters` defined in `src/lib/providers/ministry-platform/types/provider.types.ts:221, :246`.
- Errors from `HttpClient` propagate unchanged after a `logger.error` call.

## Usage

Real callers (via `MPHelper`, not `TableService` directly — see ADR in Gotchas):

```typescript
// src/services/groupService.ts:232 — create with $userId
const result = await this.mp!.createTableRecords('Groups', [apiData], {
  $select: 'Group_ID, Group_Name',
  $userId: userId,
});

// src/services/groupService.ts:245 — partial update
const result = await this.mp!.updateTableRecords('Groups', [apiData], {
  partial: true,
  $select: 'Group_ID, Group_Name',
  $userId: userId,
});

// src/services/userService.ts:82 — filtered read
const records = await this.mp!.getTableRecords<MPUserProfile>({ ... });
```

With Zod validation (recommended — enforced in `MPHelper`, not `TableService`):

```typescript
// from src/lib/providers/ministry-platform/helper.ts:161-169 (doc example)
await mp.createTableRecords('Contact_Log', [{
  Contact_ID: 12345,
  Contact_Date: new Date().toISOString(),
  Made_By: 1,
  Notes: 'Follow-up call completed'
}], {
  schema: ContactLogSchema,
  $userId: 1
});
```

## Error handling

Errors from the underlying `HttpClient` propagate after being logged (`table.service.ts:28`, `:48`, `:67`, `:95`, `:124`, `:147`). Covered by tests:

| Status | Operation | Test location |
|---|---|---|
| 400 Bad Request | create (validation failure) | `table.service.test.ts:184-192` |
| 400 Bad Request | copyRecord | `table.service.test.ts:430-444` |
| 403 Forbidden | delete (permission denied) | `table.service.test.ts:323-331` |
| 404 Not Found | get (table/record missing) | `table.service.test.ts:100-108` |
| 404 Not Found | update (record missing) | `table.service.test.ts:241-249` |
| 404 Not Found | delete (record missing) | `table.service.test.ts:313-321` |
| 409 Conflict | create (duplicate key) | `table.service.test.ts:194-202` |
| 500 Server Error | copyRecordWithSubpages | `table.service.test.ts:501-517` |
| auth refresh failure | any | `table.service.test.ts:110-118` |

## Gotchas
- **`schema` and `partial` params are not on `TableService`** — they are added by `MPHelper` (`helper.ts:175, :256-258`). Calling `new TableService(...).createTableRecords(..., { schema })` is a type error.
- **Ambiguous columns** — when `$filter` / `$select` traverses FKs, prefix tables (e.g., `Contacts.Contact_ID`, `Contact_ID_TABLE.First_Name`). See CLAUDE.md practice #10 and `../../services/README.md`.
- **Escape user input in filters** — always `term.replace(/'/g, "''")` before interpolating into `$filter` (CLAUDE.md practice #11).
- **`deleteTableRecords` requires at least one id** — empty array produces `?id=` which is provider-dependent; no runtime guard here.
- **URL-encoding is applied to table names only** — column names inside `$filter` / `$select` are not encoded by the service.

## Related docs
- `../README.md` — provider overview (orchestration via `MinistryPlatformProvider`)
- `procedure.md` — sibling service for stored proc execution
- `file.md` — file attachments on MP records
- `../../services/README.md` — domain service layer that wraps `MPHelper`

---
title: TableService — CRUD on MP Tables
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/table.service.ts]
symbols: [TableService, getTableRecords, createTableRecords, updateTableRecords, deleteTableRecords, copyRecord, copyRecordWithSubpages]
related: [../README.md, procedure.md, file.md, ../../services/README.md]
last_verified: 2026-10-10
---

## Purpose
HTTP-level wrapper around the Ministry Platform REST `/tables/{table}` endpoints. Stateless; each method validates its path segments, calls `client.ensureValidToken()`, then the underlying `HttpClient` verb. No record-body validation at this layer — Zod `schema` validation lives one level up in `MPHelper` (see Gotchas).

## Files
- `src/lib/providers/ministry-platform/services/table.service.ts` — implementation (152 lines)
- `src/lib/providers/ministry-platform/services/table.service.test.ts` — tests (636 lines)

## Key concepts
- Constructor takes a `MinistryPlatformClient`; no singleton.
- Every method: `ensureValidToken()` → `getHttpClient().{verb}()` → return typed result.
- `TableQueryParams` include `$select`, `$filter`, `$orderby`, `$groupby`, `$having`, `$top`, `$skip`, `$distinct`, `$userId`, `$globalFilterId`, `$allowCreate` (see `src/lib/providers/ministry-platform/types/provider.types.ts:1`).
- Table name is validated (`sanitizeIdentifier` via `tableEndpoint` in `services/guards.ts`) and then URL-encoded on every endpoint; `recordId` (copy methods) and each `ids` entry (delete) must be positive safe integers. All checks run before any token work and throw a fixed message naming the field.
- **Partial vs full updates** are not parameters on `TableService` — they are a `MPHelper.updateTableRecords` concern (`partial: boolean`, default `true`; see `src/lib/providers/ministry-platform/helper.ts:286-287`).
- **`schema` (Zod validation)** is also not a `TableService` parameter — it is a `MPHelper` concern (`src/lib/providers/ministry-platform/helper.ts:201`, `:286`). `TableService` itself does not validate.

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
- `deleteTableRecords` merges `ids` into query params as `id: [1, 2, 3]` (`table.service.ts:145`), not in the body.
- `createTableRecords` / `updateTableRecords` pass `records` array as the body and `params` as query string.
- `copyRecord` does NOT copy sub-pages or files; `copyRecordWithSubpages` can via `CopyParameters.SubpageIds` and `CopyParameters.CopyFiles`. Both create `dp_Sequences` entries for native MP series linkage (JSDoc at `table.service.ts:73`, `:101`).
- `RecurrencePattern` and `CopyParameters` defined in `src/lib/providers/ministry-platform/types/provider.types.ts:220, :245`.
- Errors from `HttpClient` propagate unchanged after `logger.error('mp.table.<op>_failed', { table, recordId?, error: errorName(e) })`.

## Usage

Real callers (via `MPHelper`, not `TableService` directly — see CLAUDE.md "Data Flow"):

```typescript
// src/services/groupService.ts:374 — create with $userId (from the AuthorizationService gate)
const result = await this.mp!.createTableRecords('Groups', [apiData], {
  $select: 'Group_ID, Group_Name',
  $userId,
});

// src/services/groupService.ts:398 — partial update
const result = await this.mp!.updateTableRecords('Groups', [apiData], {
  partial: true,
  $select: 'Group_ID, Group_Name',
  $userId,
});

// src/services/userService.ts (getUserProfile) — filtered read
const records = await this.mp!.getTableRecords<MPUserProfile>({ ... });
```

With Zod validation (recommended — enforced in `MPHelper`, not `TableService`):

```typescript
// adapted from src/lib/providers/ministry-platform/helper.ts:186-196 (JSDoc example)
// Schemas are not in the models barrel: import from '.../models/ContactLogSchema'.
await mp.createTableRecords('Contact_Log', [{
  Contact_ID: 12345,
  Contact_Date: await tz.toMpSqlDatetime(new Date()), // DomainTimezoneService (CLAUDE.md rule 17)
  Made_By: 1,
  Notes: 'Follow-up call completed'
}], {
  schema: ContactLogSchema,
  $userId: 1
});
```

Generated Zod schemas validate `DateTime`/`Timestamp` columns with a regex that accepts the `YYYY-MM-DD HH:MM:SS` string `toMpSqlDatetime` returns as well as ISO forms (`T` separator, optional `Z`/offset), so `schema` and CLAUDE.md rule 17 combine as shown. See `../type-generation.md` § Zod type mapping and `../../ministryplatform.datetimehandling.md`.

## Error handling

Errors from the underlying `HttpClient` propagate after being logged (`table.service.ts:29`, `:47`, `:65`, `:93`, `:121`, `:148`). Covered by tests:

| Status | Operation | Test location |
|---|---|---|
| 400 Bad Request | create (validation failure) | `table.service.test.ts:196-204` |
| 400 Bad Request | copyRecord | `table.service.test.ts:435-449` |
| 403 Forbidden | delete (permission denied) | `table.service.test.ts:335-343` |
| 404 Not Found | get (table/record missing) | `table.service.test.ts:112-120` |
| 404 Not Found | update (record missing) | `table.service.test.ts:253-261` |
| 404 Not Found | delete (record missing) | `table.service.test.ts:325-333` |
| 409 Conflict | create (duplicate key) | `table.service.test.ts:206-214` |
| 500 Server Error | copyRecordWithSubpages | `table.service.test.ts:506-522` |
| auth refresh failure | any | `table.service.test.ts:122-130` |

## Gotchas
- **`schema` and `partial` params are not on `TableService`** — they are added by `MPHelper` (`helper.ts:201, :286-287`). Calling `new TableService(...).createTableRecords(..., { schema })` is a type error.
- **Ambiguous columns** — when `$filter` / `$select` traverses FKs, prefix tables (e.g., `Contacts.Contact_ID`, `Contact_ID_TABLE.First_Name`). See CLAUDE.md practice #10 and `../../services/query-patterns.md`.
- **Escape user input in filters** — always `term.replace(/'/g, "''")` before interpolating into `$filter` (CLAUDE.md practice #11).
- **`deleteTableRecords` requires at least one id** — an empty array passes the guard and sends `DELETE /tables/{table}` with no `id` params (an empty array serializes to nothing); callers must check length.
- **URL-encoding is applied to table names only** — column names inside `$filter` / `$select` are not encoded by the service.

## Related docs
- `../README.md` — provider overview (orchestration via `MinistryPlatformProvider`)
- `procedure.md` — sibling service for stored proc execution
- `file.md` — file attachments on MP records
- `../../services/README.md` — domain service layer that wraps `MPHelper`

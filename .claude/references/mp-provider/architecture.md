---
title: MP Provider Architecture
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/helper.ts
  - src/lib/providers/ministry-platform/provider.ts
  - src/lib/providers/ministry-platform/client.ts
  - src/lib/providers/ministry-platform/index.ts
symbols:
  - MPHelper
  - MinistryPlatformProvider
  - MinistryPlatformClient
related:
  - client.md
  - error-handling.md
  - ../services/README.md
last_verified: 2026-04-17
---

## Purpose
Four-layer SDK: facade (`MPHelper`) → singleton orchestrator (`MinistryPlatformProvider`) → per-domain services → HTTP/auth client (`MinistryPlatformClient` + `HttpClient`). Consumers instantiate `MPHelper` freely; state (token, services) lives on the singleton.

## Files
- `src/lib/providers/ministry-platform/helper.ts` — `MPHelper` class, param-mapping + Zod validation
- `src/lib/providers/ministry-platform/provider.ts` — `MinistryPlatformProvider` singleton, holds `MinistryPlatformClient` + six services
- `src/lib/providers/ministry-platform/client.ts` — OAuth2 token lifecycle + HttpClient factory
- `src/lib/providers/ministry-platform/index.ts` — barrel export
- `src/lib/providers/ministry-platform/helper.test.ts` — helper tests (Zod, param mapping)
- `src/lib/providers/ministry-platform/provider.test.ts` — provider tests (delegation)

## Key concepts

- **Facade (`MPHelper`)** — friendly param names (`select`, `filter`, `top`) mapped to `$`-prefixed OData params (`$select`, `$filter`, `$top`); optional Zod validation on create/update
- **Singleton (`MinistryPlatformProvider`)** — private constructor + `getInstance()`; six services share one `MinistryPlatformClient` so they share one token cache
- **Client (`MinistryPlatformClient`)** — holds cached token, `expiresAt`, and an `HttpClient` bound to `() => this.token` so services always see the latest token without being re-wired
- **HTTP (`HttpClient`)** — one instance per pipeline (default + dev), methods: `get`, `post`, `postFormData`, `put`, `putFormData`, `delete`
- **Services** — six domain services instantiated once in the provider constructor (`TableService`, `ProcedureService`, `CommunicationService`, `MetadataService`, `DomainService`, `FileService`)

## API / Interface

### Entry point — `new MPHelper()`

Every `new MPHelper()` instance resolves to the same singleton under the hood:

```typescript
// src/lib/providers/ministry-platform/helper.ts:41-43
constructor() {
  this.provider = MinistryPlatformProvider.getInstance();
}
```

Consequence: creating many `MPHelper` instances is cheap — they all share token + services.

### `MPHelper` methods (grouped)

| Group | Methods |
|-------|---------|
| Table CRUD | `getTableRecords<T>(params)`, `createTableRecords<T>(table, records, params?)`, `updateTableRecords<T>(table, records, params?)`, `deleteTableRecords<T>(table, ids, params?)` |
| Copy / recurrence | `copyRecord<T>(table, recordId, pattern, params?)`, `copyRecordWithSubpages<T>(table, recordId, copyParams, params?)`, `generateSequence(pattern)` |
| Stored procedures | `getProcedures(search?)`, `executeProcedure(procedure, params?)`, `executeProcedureWithBody(procedure, parameters)` |
| Communications | `createCommunication(communication, attachments?)`, `sendMessage(message, attachments?)` |
| Files | `getFilesByRecord`, `uploadFiles`, `updateFile`, `deleteFile`, `getFileContentByUniqueId`, `getFileMetadata`, `getFileMetadataByUniqueId` |
| Domain | `getDomainInfo()`, `getGlobalFilters(params?)` |
| Metadata | `getTables(search?)`, `refreshMetadata()` |

Full signatures in `src/lib/providers/ministry-platform/helper.ts`.

### `MinistryPlatformProvider` (singleton)

```typescript
// src/lib/providers/ministry-platform/provider.ts:82-89
public static getInstance(): MinistryPlatformProvider {
  if (!this.instance) {
    this.instance = new MinistryPlatformProvider();
  }
  return this.instance;
}
```

```typescript
// src/lib/providers/ministry-platform/provider.ts:64-75
private constructor() {
  this.client = new MinistryPlatformClient();
  this.tableService = new TableService(this.client);
  this.procedureService = new ProcedureService(this.client);
  this.communicationService = new CommunicationService(this.client);
  this.metadataService = new MetadataService(this.client);
  this.domainService = new DomainService(this.client);
  this.fileService = new FileService(this.client);
}
```

Most methods are thin pass-throughs to one of the six services. The exception is `generateSequence`, which calls the client's HttpClient directly:

```typescript
// src/lib/providers/ministry-platform/provider.ts:228-244
public async generateSequence(pattern: RecurrencePattern): Promise<string[]> {
  await this.client.ensureValidToken();
  const queryParams: QueryParams = { /* ...pattern fields... */ };
  return this.client.getHttpClient().get<string[]>('/tasks/generate-sequence', queryParams);
}
```

### Barrel re-exports

```typescript
// src/lib/providers/ministry-platform/index.ts
export { MinistryPlatformProvider } from './provider';
export { MPHelper } from './helper';
export { MinistryPlatformClient } from './client';
export * from './types';
export * from './models';
export * from './services';
export * from './auth';
```

## How it works

- **Instantiation flow:** `new MPHelper()` → `MinistryPlatformProvider.getInstance()` → on first call: `new MinistryPlatformClient()` + six `new XService(this.client)` — all share the same client reference
- **Token flow:** each service calls `this.client.ensureValidToken()` before making a request; the token value is read lazily by `HttpClient` via the getter `() => this.token` closed over at client construction time
- **Param normalization:** `MPHelper.getTableRecords` rewrites friendly names to `$`-prefixed params and forwards to `provider.getTableRecords(table, params)`
- **Validation:** optional `schema?: ZodObject<ZodRawShape>` in create/update params. If present, `MPHelper` calls `schema.parse(record)` (or `schema.partial().parse(record)` for updates when `partial !== false`) and rewraps the error as `Validation failed for record ${index}: ...`
- **Service isolation:** `TableService` / `ProcedureService` / etc. each manage their own endpoint URLs + request shapes; the provider only delegates

## Usage

```typescript
// Typical consumer pattern (from src/services/userService.ts and others)
import { MPHelper } from '@/lib/providers/ministry-platform';

const mp = new MPHelper();

const contacts = await mp.getTableRecords<Contact>({
  table: 'Contacts',
  select: 'Contact_ID,Display_Name',
  filter: 'Contact_Status_ID=1',
  top: 50,
});
```

```typescript
// Validated create (from helper.ts JSDoc examples)
import { ContactLogSchema } from '@/lib/providers/ministry-platform/models';

await mp.createTableRecords('Contact_Log', [{
  Contact_ID: 12345,
  Contact_Date: new Date().toISOString(),
  Made_By: 1,
  Notes: 'Follow-up call completed',
}], {
  schema: ContactLogSchema,
  $userId: 1,
});
```

## Gotchas

- **Singleton state is process-global.** In tests, reset with a mocked `getInstance` (see `helper.test.ts:50-82`) or mock the client + services directly (see `provider.test.ts:60-103`). The provider itself has no `reset()` method.
- **`MPHelper` constructor returns before any API call.** Token acquisition is deferred to the first method call that hits `ensureValidToken()`; construction is cheap.
- **Do not cache an `HttpClient` reference across tokens.** Services should always go through `this.client.getHttpClient()` (not capture the returned value) — only the instance is stable, token value inside is not.
- **Do not call MPHelper directly from components.** Wrap it in a service class (`src/services/*.ts`) per project convention.

## Related docs
- `client.md` — token cache + dev pipeline
- `error-handling.md` — exception surface across the stack
- `type-generation.md` — generated models consumed via the barrel (`export * from './models'`)
- `../services/README.md` — app-level services that consume `MPHelper`

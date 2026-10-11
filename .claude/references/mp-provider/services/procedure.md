---
title: ProcedureService — Stored Procedure Execution
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/procedure.service.ts]
symbols: [ProcedureService, getProcedures, executeProcedure, executeProcedureWithBody]
related: [../README.md, table.md, ../../mp-schema/required-procs.md]
last_verified: 2026-10-10
---

## Purpose
Execute MP stored procedures over REST at `/procs/{name}`. Supports query-string params (GET) and body params (POST). Procedures prefixed `api_dev_` are routed through a separate dev-credential HttpClient.

## Files
- `src/lib/providers/ministry-platform/services/procedure.service.ts` — implementation (100 lines)
- `src/lib/providers/ministry-platform/services/procedure.service.test.ts` — tests (260 lines)

## Key concepts
- **Dev-credential routing:** procedures whose name begins with `api_dev_` (case-insensitive, requires trailing underscore) use `client.ensureValidDevToken()` + `client.getDevHttpClient()`. All other procedures use the default pipeline.
- **`@DomainID` convention:** every `api_*` procedure must declare `@DomainID INT` as its first parameter. The MP API injects the current domain automatically — callers do NOT pass it. See `src/lib/providers/ministry-platform/db/api_Common_StoredProcParameters.sql:92` (`WHERE p.ParameterName <> '@DomainID'`) and `.claude/commands/newstoredproc.md:171`.
- **Result shape:** `Promise<unknown[][]>` — an outer array of result sets, each an array of rows. Callers index `result[0]` for the first result set (see `src/services/toolService.ts:139-140`, `:175-181`).
- Body parameter keys use `@ParamName` convention (matching SQL parameter names).

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/procedure.service.ts`:

```typescript
public async getProcedures(search?: string): Promise<ProcedureInfo[]>

public async executeProcedure(
    procedure: string,
    params?: QueryParams
): Promise<unknown[][]>

public async executeProcedureWithBody(
    procedure: string,
    parameters: Record<string, unknown>,
    queryParams?: QueryParams   // e.g. { $userId } for audit attribution
): Promise<unknown[][]>
```

### Endpoint → method map

| Method | HTTP | Endpoint | Credential pipeline |
|---|---|---|---|
| `getProcedures` | GET | `/procs` (optional `?$search=`) | Default only (never dev) |
| `executeProcedure` | GET | `/procs/{name}` (params → query string) | Default or dev (by prefix) |
| `executeProcedureWithBody` | POST | `/procs/{name}` (params → body, `queryParams` → query string) | Default or dev (by prefix) |

### Dev-prefix detection

```typescript
// procedure.service.ts:98-100
function isDevProcedure(procedure: string): boolean {
    return procedure.toLowerCase().startsWith(DEV_PROC_PREFIX); // 'api_dev_'
}
```

- Matches `api_dev_DeployTool`, `API_DEV_X`, `Api_Dev_Y`.
- Does NOT match `api_developer_GetThing` (trailing underscore required). Verified by `procedure.service.test.ts:153-162`.
- `getProcedures` never uses the dev pipeline regardless of `$search` value (`procedure.service.test.ts:87-94`).

## How it works
- Both execute methods call `resolveHttpClient(procedure)` which branches on `isDevProcedure` and invokes the matching `ensureValid*Token` + `get*HttpClient` pair (`procedure.service.ts:87-95`).
- Procedure name is validated with `sanitizeIdentifier` (`^[A-Za-z_][A-Za-z0-9_]*$`, ≤128) and then URL-encoded, before any token work; a bad name throws `Invalid procedure name`. There is **no** allowlist of callable procedures — by design for this template; every caller is gated and passes a literal proc name. A downstream clone that wants defence in depth can add one here.
- Errors propagate after `logger.error('mp.procs.execute_failed', { procedure, error: errorName(e) })`.

## Stored procedures called by this codebase

| Procedure | Caller | Credential | Doc |
|---|---|---|---|
| `api_Tools_GetPageData` | `src/services/toolService.ts:134` | default | `../../mp-schema/required-procs.md` |
| `api_Common_GetSelection` | `src/services/toolService.ts:168` | default | `../../mp-schema/required-procs.md` |
| `api_Tools_GetUserTools` | `src/services/toolService.ts:202` | default | `../../mp-schema/required-procs.md` |
| `api_MPNextTools_GetPages` | `src/services/toolService.ts:228`, `fieldManagementService.ts:50` | default | `../../mp-schema/required-procs.md` |
| `api_MPNextTools_GetPageFields` | `src/services/fieldManagementService.ts:64` | default | `../../mp-schema/required-procs.md` |
| `api_MPNextTools_UpdatePageFieldOrder` | `src/services/fieldManagementService.ts:118` | default | `../../mp-schema/required-procs.md` |
| `api_dev_DeployTool` | `src/services/toolService.ts:297` | **dev** | `../../mp-schema/required-procs.md` |

## Usage

Real caller from `src/services/toolService.ts:126-148`:

```typescript
public async getPageData(pageID: number): Promise<PageData | null> {
  await AuthorizationService.getInstance().requireSecurityRole({
    table: 'dp_Pages',
    operation: 'read',
  });
  try {
    // DomainID is automatically injected by MP API
    const result = await this.mp!.executeProcedureWithBody('api_Tools_GetPageData', {
      "@PageID": pageID
    });

    if (result && result.length > 0 && result[0].length > 0) {
      const pageData = result[0][0] as PageData;
      return pageData;
    }

    return null;
  } catch (error) {
    throw error;
  }
}
```

Dev-pipeline example from `src/services/toolService.ts:297`:

```typescript
const resultSets = await this.mp!.executeProcedureWithBody('api_dev_DeployTool', payload, { $userId });
```

## Error handling

| Status | Test location |
|---|---|
| 403 Forbidden | `procedure.service.test.ts:81-85` |
| 404 Not Found | `procedure.service.test.ts:123-127` |
| 500 Internal Server Error | `procedure.service.test.ts:195-201` |

## Gotchas
- **Never pass `@DomainID`** — the MP API injects it from the authenticated domain context. Passing it manually causes a parameter mismatch. Comments in real callers repeat this: `// DomainID is automatically injected by MP API` (`src/services/toolService.ts:133`, `:192`).
- **Every `api_*` procedure definition must declare `@DomainID INT` first** — MP API will not expose procedures that omit it (`.claude/commands/newstoredproc.md:171`). This is SQL-side, not TS-side.
- **Dev-prefix match is case-insensitive** — whitespace anywhere in a procedure name is now refused by the identifier guard.
- **Result shape is nested `unknown[][]`** — callers must guard for empty result sets and empty row arrays before indexing (`src/services/toolService.ts:139, :206`).

## Related docs
- `../README.md` — provider overview
- `table.md` — sibling table CRUD service
- `../../mp-schema/required-procs.md` — the procs the app calls at runtime, with param shapes
- `../../mp-schema/stored-procs.md` — full auto-generated procedure catalog

---
title: ProcedureService — Stored Procedure Execution
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/procedure.service.ts]
symbols: [ProcedureService, getProcedures, executeProcedure, executeProcedureWithBody]
related: [../README.md, table.md, ../../required-stored-procs.md]
last_verified: 2026-04-17
---

## Purpose
Execute MP stored procedures over REST at `/procs/{name}`. Supports query-string params (GET) and body params (POST). Procedures prefixed `api_dev_` are routed through a separate dev-credential HttpClient.

## Files
- `src/lib/providers/ministry-platform/services/procedure.service.ts` — implementation (101 lines)
- `src/lib/providers/ministry-platform/services/procedure.service.test.ts` — tests (243 lines)

## Key concepts
- **Dev-credential routing:** procedures whose name begins with `api_dev_` (case-insensitive, requires trailing underscore) use `client.ensureValidDevToken()` + `client.getDevHttpClient()`. All other procedures use the default pipeline.
- **`@DomainID` convention:** every `api_*` procedure must declare `@DomainID INT` as its first parameter. The MP API injects the current domain automatically — callers do NOT pass it. See `src/lib/providers/ministry-platform/db/api_Common_StoredProcParameters.sql:92` (`WHERE p.ParameterName <> '@DomainID'`) and `.claude/commands/newstoredproc.md:171`.
- **Result shape:** `Promise<unknown[][]>` — an outer array of result sets, each an array of rows. Callers index `result[0]` for the first result set (see `src/services/toolService.ts:132`, `:161-167`).
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
    parameters: Record<string, unknown>
): Promise<unknown[][]>
```

### Endpoint → method map

| Method | HTTP | Endpoint | Credential pipeline |
|---|---|---|---|
| `getProcedures` | GET | `/procs` (optional `?$search=`) | Default only (never dev) |
| `executeProcedure` | GET | `/procs/{name}` (params → query string) | Default or dev (by prefix) |
| `executeProcedureWithBody` | POST | `/procs/{name}` (params → body) | Default or dev (by prefix) |

### Dev-prefix detection

```typescript
// procedure.service.ts:98-100
function isDevProcedure(procedure: string): boolean {
    return procedure.trim().toLowerCase().startsWith(DEV_PROC_PREFIX); // 'api_dev_'
}
```

- Matches `api_dev_DeployTool`, `API_DEV_X`, `Api_Dev_Y`.
- Does NOT match `api_developer_GetThing` (trailing underscore required). Verified by `procedure.service.test.ts:144-153`.
- `getProcedures` never uses the dev pipeline regardless of `$search` value (`procedure.service.test.ts:75-82`).

## How it works
- Both execute methods call `resolveHttpClient(procedure)` which branches on `isDevProcedure` and invokes the matching `ensureValid*Token` + `get*HttpClient` pair (`procedure.service.ts:87-95`).
- Procedure name is URL-encoded on every call (`procedure.service.ts:45`, `:71`).
- Errors from `HttpClient` propagate after `logger.error`.

## Stored procedures called by this codebase

| Procedure | Caller | Credential | Doc |
|---|---|---|---|
| `api_Tools_GetPageData` | `src/services/toolService.ts:127` | default | `../../required-stored-procs.md` |
| `api_Common_GetSelection` | `src/services/toolService.ts:154` | default | `../../required-stored-procs.md` |
| `api_Tools_GetUserTools` | `src/services/toolService.ts:185` | default | `../../required-stored-procs.md` |
| `api_MPNextTools_GetPages` | `src/services/toolService.ts:207`, `fieldManagementService.ts:44` | default | — |
| `api_MPNextTools_GetPageFields` | `src/services/fieldManagementService.ts:54` | default | — |
| `api_MPNextTools_UpdatePageFieldOrder` | `src/services/fieldManagementService.ts:94` | default | — |
| `api_dev_DeployTool` | `src/services/toolService.ts:268` | **dev** | — |
| `api_CloudTools_GetSelection` | (legacy reference in facts) | default | — |

## Usage

Real caller from `src/services/toolService.ts:127-140`:

```typescript
public async getPageData(pageID: number): Promise<PageData | null> {
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

Dev-pipeline example from `src/services/toolService.ts:268`:

```typescript
const resultSets = await this.mp!.executeProcedureWithBody('api_dev_DeployTool', payload);
```

## Error handling

| Status | Test location |
|---|---|
| 403 Forbidden | `procedure.service.test.ts:69-73` |
| 404 Not Found | `procedure.service.test.ts:114-118` |
| 500 Internal Server Error | `procedure.service.test.ts:177-183` |

## Gotchas
- **Never pass `@DomainID`** — the MP API injects it from the authenticated domain context. Passing it manually causes a parameter mismatch. Comments in real callers repeat this: `// DomainID is automatically injected by MP API` (`src/services/toolService.ts:126`, `:178`).
- **Every `api_*` procedure definition must declare `@DomainID INT` first** — MP API will not expose procedures that omit it (`.claude/commands/newstoredproc.md:171`). This is SQL-side, not TS-side.
- **Dev-prefix match is trim+lowercase** — leading whitespace in the procedure name is tolerated; internal whitespace is URL-encoded and forwarded (`procedure.service.test.ts:105-112`).
- **Result shape is nested `unknown[][]`** — callers must guard for empty result sets and empty row arrays before indexing (`src/services/toolService.ts:132, :188`).

## Related docs
- `../README.md` — provider overview
- `table.md` — sibling table CRUD service
- `../../required-stored-procs.md` — the three stored procs required by the app at runtime, with param shapes
- `../../ministryplatform.storedprocs.md` — full auto-generated procedure catalog

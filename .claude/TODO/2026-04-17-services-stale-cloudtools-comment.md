---
title: getSelectionRecordIds JSDoc references wrong SP name
severity: low
tags: [doc, drift]
area: services
files: [src/services/toolService.ts]
discovered: 2026-04-17
discovered_by: services
status: open
---

## Problem
`ToolService.getSelectionRecordIds` has a JSDoc comment claiming it calls `api_CloudTools_GetSelection`, but the actual code calls `api_Common_GetSelection`. Readers using hover-docs or grep for the SP name will be misled.

## Evidence
- `src/services/toolService.ts:145` — comment: `* Calls the api_CloudTools_GetSelection stored procedure.`
- `src/services/toolService.ts:154` — actual call: `executeProcedureWithBody('api_Common_GetSelection', {...})`

## Proposed fix
Update the JSDoc line to match the real SP name:

```typescript
 * Calls the api_Common_GetSelection stored procedure.
```

Also verify `.claude/references/_meta/facts/2026-04-17.md` lists `api_Common_GetSelection` (it does — the misnamed `api_CloudTools_GetSelection` should likely be removed from the facts snapshot's "Stored procs referenced in code" list because grep finds it only in the JSDoc comment, not in any active call site).

## Impact if not fixed
Minor documentation drift. Low risk of confusion but no functional impact.

---
title: ToolService.getSelectionRecordIds JSDoc names the wrong stored procedure
severity: low
tags: [drift, doc]
area: services
files: [src/services/toolService.ts]
discovered: 2026-04-17
discovered_by: components-dev-panel
status: open
---

## Problem
The JSDoc on `ToolService.getSelectionRecordIds` claims the method calls `api_CloudTools_GetSelection`, but the implementation one line below actually calls `api_Common_GetSelection`. Readers of the dev-panel code path (which invokes this method via `resolveSelection`) may trust the comment over the implementation.

## Evidence
- `src/services/toolService.ts:145` — `* Calls the api_CloudTools_GetSelection stored procedure.`
- `src/services/toolService.ts:154` — `const result = await this.mp!.executeProcedureWithBody('api_Common_GetSelection', {`
- Confirmed by `.claude/references/_meta/facts/2026-04-17.md:42-49` — both names appear in the frozen stored-proc list, but `api_Common_GetSelection` is the one actually called from source.
- `.claude/references/required-stored-procs.md:41` already documents `api_Common_GetSelection` as the canonical name.

## Proposed fix
Update the comment at `src/services/toolService.ts:145` from `api_CloudTools_GetSelection` to `api_Common_GetSelection`.

## Impact if not fixed
Low. Doc drift in source comments. The shard-agent working on `services/tool-service.md` should pick this up when drafting that reference doc.

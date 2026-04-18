---
title: required-stored-procs.md missing api_MPNextTools_* and api_dev_DeployTool
severity: medium
tags: [drift, doc]
area: mp-schema
files: [.claude/references/required-stored-procs.md]
discovered: 2026-04-17
discovered_by: services
status: resolved
resolved_by: mp-schema-review
resolved_in: .claude/references/mp-schema/required-procs.md
---

## Problem
The flat reference `.claude/references/required-stored-procs.md` documents only three procedures (`api_Tools_GetPageData`, `api_Common_GetSelection`, `api_Tools_GetUserTools`) — but services currently call four additional procs that are not listed:

- `api_MPNextTools_GetPages`              (ToolService.listPages, FieldManagementService.getPages)
- `api_MPNextTools_GetPageFields`         (FieldManagementService.getPageFields)
- `api_MPNextTools_UpdatePageFieldOrder`  (FieldManagementService.updatePageFieldOrder)
- `api_dev_DeployTool`                    (ToolService.deployTool)

The facts snapshot `.claude/references/_meta/facts/2026-04-17.md` already lists the correct eight procs — `required-stored-procs.md` has drifted.

## Evidence
- `src/services/fieldManagementService.ts:44, 54, 94` — three `api_MPNextTools_*` calls
- `src/services/toolService.ts:207, 268` — `api_MPNextTools_GetPages`, `api_dev_DeployTool` calls
- `.claude/references/_meta/facts/2026-04-17.md:41-49` — authoritative 8-proc list
- `.claude/references/required-stored-procs.md` — only documents 3 procs

## Proposed fix
This is in the `mp-schema` domain (not services). The mp-schema shard should migrate `required-stored-procs.md` to `.claude/references/mp-schema/required-procs.md` and extend it with entries for the four missing procedures:

- `api_MPNextTools_GetPages` — no params, returns `[{Page_ID, Display_Name, Table_Name}]`
- `api_MPNextTools_GetPageFields` — `@PageID INT`, returns `PageField[]` rows
- `api_MPNextTools_UpdatePageFieldOrder` — 11 params (see service doc)
- `api_dev_DeployTool` — 10 params, returns 3 result sets (tool, pages, roles); uses dev credentials

SQL DDL lives in `src/lib/providers/ministry-platform/db/` — confirm with `ls src/lib/providers/ministry-platform/db/`.

## Impact if not fixed
Documentation underreports the surface area of stored-procs the app depends on. Anyone deploying MP from scratch using only `required-stored-procs.md` would miss four procedures and break field-management + deploy-tool features.

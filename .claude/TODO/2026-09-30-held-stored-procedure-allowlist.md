---
title: "Held — Deny-all stored-procedure allowlist in the MP provider"
severity: medium
tags: [security]
area: mp-provider
files: [src/lib/providers/ministry-platform/services/procedure.service.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P9)
status: open
---

## Problem
Owner decision (2026-09-30): **skip for now.** Upstream restricts `executeProcedure*` to an explicit allowlist so
a future call path can't reach arbitrary `api_*` procs via the service account. Procs this fork calls:
`api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder`,
`api_Tools_GetPageData`, `api_Tools_GetUserTools`, `api_Common_GetSelection`, `api_dev_DeployTool`
(plus `api_dev_GetProcedureDefinition` from the dev panel).

## Proposed fix
Confirm each proc with the owner, then add a frozen allowlist checked in `procedure.service.ts`, with a test that
an unlisted name is refused before any HTTP call.

## Impact if not fixed
Defence in depth only — every current caller is gated and passes a literal proc name.

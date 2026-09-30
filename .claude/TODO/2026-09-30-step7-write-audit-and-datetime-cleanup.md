---
title: "Step 7 — Write-audit gaps and datetime drift cleanup"
severity: medium
tags: [drift, missing-test]
area: services
files: [src/services/familyService.ts, src/services/groupService.ts, src/components/add-edit-family/add-edit-family.tsx, src/services/authorizationService.ts, src/lib/providers/ministry-platform/db/]
discovered: 2026-09-30
discovered_by: playbook-audit (port-mp-write-attribution.md, port-mp-datetime-handling.md)
status: open
---

## Problem
- Stored-proc writes (`api_MPNextTools_UpdatePageFieldOrder`, `api_dev_DeployTool`) pass `$userId` in the query
  string but neither proc declares `@UserID` or writes `dp_Audit_Log` — MP almost certainly doesn't audit DML inside
  a proc, so page-field reorders leave no audit trail.
- `familyService.ts:83-87` `toDatetime()` builds `` `${value}T00:00:00` `` itself for `Date_of_Birth`,
  `Season_Start/End` instead of `DomainTimezoneService`; `includes("T")` passes `Z`-tagged values through.
- Edit prefill (`groupService.getGroup` ~`:227,261`, `add-edit-family.tsx:1239`) uses `.split('T')[0]` — breaks on
  MP's space-separated `YYYY-MM-DD HH:MM:SS`.
- `mp.write.non_user` is `console.warn(name, obj)` not JSON with an `event` key, and fires on refused reads.
- `familyService.test.ts` asserts `$userId` on only some update calls. Default tz mock is `"UTC"` (hides drift).
- Datetime reference doc is thinner than upstream (132 vs 230 lines); not linked from INDEX / services README.
  Note: Git Bash on Windows drops `TZ` values containing `/` — use PowerShell `$env:TZ`.

## Proposed fix
Explicit `@UserID` + `dp_Audit_Log`/`dp_Audit_Detail` inserts in the proc SQL (then `npm run mp:build:install`), or
document the gap. Route family dates through `tz.toMpSqlDatetime`; `replace(' ', 'T').slice(0,10)` prefill;
JSON log for writes only; loop `$userId` assertion over every update call; non-UTC tz in tests; port the fuller doc.

## Impact if not fixed
No audit trail for domain-wide page-field changes; latent date drift if a caller ever sends a zoned value.

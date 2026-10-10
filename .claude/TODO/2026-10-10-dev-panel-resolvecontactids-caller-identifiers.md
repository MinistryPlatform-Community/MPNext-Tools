---
title: "ToolService.resolveContactIds still takes table/column names from its caller (dev panel)"
severity: low
tags: [security]
area: services
files: [src/services/toolService.ts, src/components/dev-panel/panels/contact-records-actions.ts]
discovered: 2026-09-30
discovered_by: step2-authorization-and-input-validation (deferred observation, carried over when that TODO was closed)
status: open
---

## Problem
Step 2 stopped `FamilyService.resolveContactIdFromPage` from trusting
caller-supplied table and column names. It now takes `{ pageId, recordId }` and
looks up the page's metadata on the server through `ToolService.getPageData`.
`ToolService.resolveContactIds`, which the dev panel's `ContactRecordsPanel`
uses, still accepts table/column identifiers from its caller. They are
identifier-validated (`validateColumnName`), and the path runs only in dev
(`requireDevSession`), so it is not exploitable today. It is still the one
remaining place where a caller picks which table the service account reads.

## Evidence
- `src/services/toolService.ts` `resolveContactIds`: table/column arguments
  come from the dev-panel action.
- `src/components/dev-panel/panels/contact-records-actions.ts`: gated by
  `requireDevSession()`.

## Proposed fix
Give it the same treatment as `resolveContactIdFromPage`. The action passes
`pageId` and the selection; the service looks up `Table_Name`, primary key and
contact column from `getPageData(pageId)` and validates them with
`validateFkPath`. Add a hostile-identifier test.

## Impact if not fixed
Defence in depth only. A future non-dev caller could copy the pattern and read
arbitrary numeric columns through the service account.

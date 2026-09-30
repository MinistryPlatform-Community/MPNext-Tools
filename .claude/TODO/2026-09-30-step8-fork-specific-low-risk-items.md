---
title: "Step 8 — Fork-specific low-risk items: address-label caps, error boundaries, tool-params decode, codegen escaping"
severity: low
tags: [security, bug]
area: components
files: [src/components/address-labels/actions.ts, src/services/addressLabelService.ts, src/app/global-error.tsx, src/lib/tool-params.server.ts, src/lib/providers/ministry-platform/scripts/generate-types.ts, src/lib/providers/ministry-platform/db/]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md, fork sweep)
status: open
---

## Problem
- Address labels: `mergeTemplate`/`generateLabel*` merge client-sent labels (not re-fetched) with no count cap;
  the 5 MB `.docx` template is PizZip-decompressed with no size limit (zip bomb); the 5 MB check is dead because
  Next's default server-action body limit is 1 MB.
- `global-error.tsx` is retry-button only — no plain `<a href="/">`, button not held until hydration.
- `tool-params.server.ts` `decodeURIComponent(recordDescription)` throws on a stray `%` and crashes the page.
- `generate-types.ts:361,414-421` interpolates MP metadata raw into generated source.
- `api_dev_GetProcedureDefinition` lacks `@DomainID INT` as first parameter (repo rule for `api_*` procs).
- `UserService.getUserProfile` returns `User_ID`, `Mobile_Phone`, roles and groups to the client — trim to what the UI uses.

## Proposed fix
Count cap + re-fetch or validate labels server-side; cap uncompressed size / entry count before PizZip; align
`serverActions.bodySizeLimit` with the documented limit; `global-error` fallback link; safe decode; escape codegen
strings; add `@DomainID`; minimise profile DTO.

## Impact if not fixed
Memory exhaustion from a crafted template; a malformed URL crashes a tool page; minor data over-exposure.

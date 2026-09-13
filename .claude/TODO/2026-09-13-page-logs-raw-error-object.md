---
title: "AddEditFamilyPage logs the raw error object instead of an identifier"
severity: medium
tags: [security, drift]
area: components
files: [src/app/(web)/tools/addeditfamily/page.tsx]
discovered: 2026-09-13
discovered_by: coverage-agent-addeditfamily
status: open
---

## Problem
`AddEditFamilyPage` swallows a failed `resolveContactIdFromPage` call with:

```ts
console.warn("Failed to resolve Contact_ID from page record:", error);
```

CLAUDE.md rule 14 requires errors to log identifiers and shape only — never
record content, `$filter` strings, or request/response bodies, "including
inside thrown error messages, which travel further than logs do." Logging the
raw `error` object prints its `.message` (and, depending on the runtime,
`.stack`), which can carry the interpolated MP `$filter` string built in
`FamilyService.resolveContactIdFromPage` (`` `${primaryKey} = ${recordId}` ``)
or other request detail if the underlying `getTableRecords` call or
`validateColumnName`/`validatePositiveInt` throws with that detail embedded.

The sibling file `src/lib/tool-params.server.ts` (same call-swallowing shape,
literally a few lines away in the import graph) already gets this right:

```ts
// Identifier only. A caller without an MP security role also lands
// here — the tools layout redirects them to /no-access, and the page
// simply renders without page metadata in the meantime.
console.warn('tool_params.page_data_unavailable', { pageID: parsedPageID });
```

`page.tsx` should follow the same pattern instead of passing `error` through.

## Evidence
- `src/app/(web)/tools/addeditfamily/page.tsx:29` — `console.warn("Failed to resolve Contact_ID from page record:", error)`
- `src/lib/tool-params.server.ts:58-60` — the correct pattern, logging an identifier object with no error content
- `src/services/familyService.ts:140-165` — `resolveContactIdFromPage` builds a `$filter` string from `primaryKey`/`recordId` that could surface in a thrown error's `.message`

## Proposed fix
Replace the `console.warn` call with an identifier-only log, e.g.:

```ts
console.warn("addeditfamily.resolve_contact_id_failed", {
  tableName: params.pageData.Table_Name,
  recordID: params.recordID,
});
```

and drop `error` from the log call entirely (or log only `error instanceof Error ? error.name : typeof error` if a coarse classification is wanted).

## Impact if not fixed
Low likelihood, low blast radius — this only logs when the page-record
resolution has already failed, and only to server logs. But it is the second
place after `tool-params.server.ts`'s example that this exact swallow-and-warn
shape appears, and it is the one that gets it wrong; left uncorrected, it is
an easy pattern to copy into the next new page.

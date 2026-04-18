---
title: Missing test file for tool-params.ts
severity: medium
tags: [missing-test]
area: utils
files: [src/lib/tool-params.ts]
discovered: 2026-04-17
discovered_by: utils
status: open
---

## Problem
`src/lib/tool-params.ts` exports `parseToolParams`, `isNewRecord`, and `isEditMode` — all consumed by every tool page under `src/app/(web)/tools/*/page.tsx` — but there is no `src/lib/tool-params.test.ts`. The facts snapshot lists 37 test files; this file is absent. Regressions in param parsing (wrong key, wrong coercion, missed URI decode, pageData hydration behavior) would ship silently.

## Evidence
- `Glob src/lib/tool-params.test.ts` → no file
- `src/lib/tool-params.ts:30-75` — non-trivial parsing logic (dual-shape input, `parseInt`, `decodeURIComponent`, async `ToolService.getPageData` with swallowed errors) is entirely uncovered
- Consumer list in `.claude/references/utils/tool-params.md` — 5 page entries + tool-container + dev-panel all depend on this

## Proposed fix
Add `src/lib/tool-params.test.ts` covering:
- `parseToolParams` with `URLSearchParams` input and with the plain-object shape
- Array-valued keys collapsing to the first element
- `recordID === -1` and `undefined` handling via `isNewRecord` / `isEditMode`
- `recordDescription` URL-decoding
- `pageData` hydration success path (mock `ToolService.getInstance().getPageData`)
- `pageData` hydration failure path — error is swallowed, `pageData` stays `undefined`
- `parseInt` of non-numeric strings (see companion TODO `2026-04-17-utils-tool-params-parseint-nan`)

## Impact if not fixed
Every tool page routes user-controlled query strings through this unfunctioned surface. A regression here would affect record-edit correctness, selection handling, and page hydration across the entire tools app.

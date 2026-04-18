---
title: parseToolParams leaks NaN for non-numeric numeric-expected query params
severity: low
tags: [bug]
area: utils
files: [src/lib/tool-params.ts]
discovered: 2026-04-17
discovered_by: utils
status: open
---

## Problem
`parseToolParams` coerces numeric params via `x ? parseInt(x, 10) : undefined`. When `x` is a non-empty non-numeric string (e.g., `?pageID=abc`), `parseInt` returns `NaN`, which is truthy-typed as `number` and assigned to `pageID` / `s` / `sc` / `p` / `v` / `recordID`. Downstream consumers see a `typeof === 'number'` value that fails every equality check and silently propagates into `ToolService.getPageData(NaN)`.

## Evidence
- `src/lib/tool-params.ts:49` — `const parsedPageID = pageID ? parseInt(pageID, 10) : undefined;`
- `src/lib/tool-params.ts:65-70` — identical pattern for `s`, `sc`, `p`, `v`, `recordID`
- If `pageID === 'abc'`, `parsedPageID === NaN`; the branch at `:53` (`if (parsedPageID)`) coincidentally short-circuits because `NaN` is falsy, so `pageData` stays undefined — but the returned `pageID` is still `NaN`.
- Consumers such as `src/components/dev-panel/panels/params-panel.tsx` display and conditionally act on these values; `NaN` renders as `"NaN"` and breaks `===` checks.

## Proposed fix
Change each numeric parse to:
```typescript
const parsed = x ? Number.parseInt(x, 10) : undefined;
const safe = Number.isFinite(parsed) ? parsed : undefined;
```
Or centralize in a `parseIntOrUndefined(x)` helper. Add a unit test in the new `tool-params.test.ts` (see companion TODO) covering `?pageID=abc` and `?recordID=xyz`.

## Impact if not fixed
Malformed query strings from hand-edited URLs or broken callers produce `NaN` values that silently corrupt downstream state. Low severity because (a) MP always sends valid integers, and (b) the immediate `if (parsedPageID)` guard happens to filter `NaN`, but the hygiene bug remains for the other 5 numeric fields and for any future consumer that doesn't short-circuit.

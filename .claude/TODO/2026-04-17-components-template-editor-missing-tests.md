---
title: No tests for src/components/template-editor/
severity: medium
tags: [missing-test]
area: components
files:
  - src/components/template-editor/template-editor-form.tsx
  - src/components/template-editor/editor-canvas.tsx
  - src/components/template-editor/editor-toolbar.tsx
  - src/components/template-editor/editor-code-dialog.tsx
  - src/components/template-editor/editor-import-dialog.tsx
  - src/components/template-editor/editor-export-dialog.tsx
  - src/components/template-editor/merge-field-picker.tsx
  - src/components/template-editor/merge-fields.ts
  - src/components/template-editor/grapes-config.ts
  - src/components/template-editor/actions.ts
discovered: 2026-04-17
discovered_by: components-template-editor
status: open
---

## Problem
The entire `src/components/template-editor/` directory has zero co-located test files, despite containing a server action (`compileMjml`) with auth-gating and size validation, token helpers (`merge-fields.ts`), a config factory (`grapes-config.ts`), and a non-trivial insertion rule in `MergeFieldPicker`. The baseline facts snapshot lists 37 test files; none are under `template-editor/`.

## Evidence
- `Glob src/components/template-editor/**/*.test.*` — no matches
- `.claude/references/_meta/facts/2026-04-17.md` — 37 test files inventory, none under `template-editor/`
- `src/components/template-editor/actions.ts:15-38` — `compileMjml` has auth + size checks that are untested
- `src/components/template-editor/merge-fields.ts:34-59` — `getFieldsByCategory`, `registerMergeFieldBlocks` untested

## Proposed fix
Add at minimum:

1. `src/components/template-editor/actions.test.ts` — mock `@/lib/auth` (`auth.api.getSession`) and `next/headers`; assert `Unauthorized` when no session; assert size-guard rejects empty and >500KB input; mock `mjml` dynamic import and assert result shape.
2. `src/components/template-editor/merge-fields.test.ts` — assert `MERGE_FIELD_CATEGORIES` dedup order, `getFieldsByCategory` filtering, and that `registerMergeFieldBlocks` calls `editor.Blocks.add` twice with expected ids.
3. (Optional) `src/components/template-editor/merge-field-picker.test.tsx` — render-with-mocked-editor covering the "selected mj-text" vs "new mj-section" insertion branches.

## Impact if not fixed
- Regressions in `compileMjml`'s auth gate or size cap can ship unnoticed (security/DoS risk).
- Merge-field category changes or taxonomy refactors will not surface breakage.
- Phase 2 of the template editor (adding MP persistence, token resolution) will be harder to land safely without a baseline.

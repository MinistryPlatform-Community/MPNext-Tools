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
status: resolved
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

---

## Resolution (2026-09-13)
Closed by the coverage push. Every file in `src/components/template-editor/`
now has a co-located test, plus the two route files:

| File | Tests | Statements | Lines |
|---|---|---|---|
| `merge-fields.ts` | 5 | 100% | 100% |
| `grapes-config.ts` | 6 | 100% | 100% |
| `actions.ts` | 7 | 100% | 100% |
| `merge-field-picker.tsx` | 7 | 100% | 100% |
| `editor-import-dialog.tsx` | 8 | 95.65% | 100% |
| `editor-code-dialog.tsx` | 11 | 97.67% | 100% |
| `editor-export-dialog.tsx` | 11 | 98.08% | 100% |
| `editor-toolbar.tsx` | 21 | 100% | 100% |
| `editor-canvas.tsx` | 7 | 100% | 100% |
| `template-editor-form.tsx` | 3 | 100% | 100% |
| `templateeditor/template-editor.tsx` | 6 | 100% | 100% |
| `templateeditor/page.tsx` | 1 | 100% | 100% |

Directory aggregate: 98.8% statements, 100% lines, across 90 tests.

Two mocking notes worth keeping, both learned the hard way:
- `useEditor()` must be mocked with a **stable object reference** built once via
  `vi.hoisted()`. Several components run `useEffect`s keyed on the editor
  object's identity, so a `useEditor: () => ({...})` factory returns a new
  object on every render and spins an infinite render loop that hangs the runner.
- `editor-canvas.tsx` imports real `.css`, which this repo's Vite/PostCSS
  config cannot process under test — both stylesheet imports are mocked to
  empty modules.

The two sibling template-editor TODOs (`-no-mp-persistence`,
`-merge-token-resolver`) were re-verified against the code during this work and
remain **accurate and open**. The new tests document current behaviour; they do
not paper over either defect.

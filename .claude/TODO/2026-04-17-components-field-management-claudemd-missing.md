---
title: CLAUDE.md Component Organization omits field-management/
severity: medium
tags: [drift, doc]
area: components
files: [CLAUDE.md, src/components/field-management]
discovered: 2026-04-17
discovered_by: components-field-management
status: open
---

## Problem
`CLAUDE.md` lists the component folders under "Component Organization" but does not include `field-management/`. The directory exists on disk with 10 files (including `actions.test.ts`) and is actively consumed by `src/app/(web)/tools/fieldmanagement/`. Agents following `CLAUDE.md` as the canonical map will miss this feature entirely.

## Evidence
- `CLAUDE.md` "Component Organization" block lists `address-labels/`, `dev-panel/`, `group-wizard/`, `layout/`, `shared-actions/`, `template-editor/`, `tool/`, `ui/`, `user-menu/`, and `feature-name/` — no `field-management/`.
- `src/components/field-management/index.ts:1-3` exports `PageSearch` and `FieldOrderEditor`.
- `src/components/field-management/actions.ts:14,20,61` defines three server actions (`fetchPages`, `fetchPageFieldData`, `savePageFieldOrder`).
- `src/app/(web)/tools/fieldmanagement/field-management.tsx:6-9` imports from `@/components/field-management` and the co-located `actions.ts`.
- `.claude/references/_meta/facts/2026-04-17.md:57` confirms 10 files in `src/components/field-management/`.

## Proposed fix
Add a line under `CLAUDE.md` "Component Organization":

```
├── field-management/     # Drag-and-drop MP page field order editor (PageSearch + FieldOrderEditor)
```

Place it alphabetically between `dev-panel/` and `group-wizard/`.

## Impact if not fixed
Agents writing new tools or refactoring the component tree rely on `CLAUDE.md`'s inventory. Missing `field-management/` means: (a) new code may duplicate the page/field-picker pattern, (b) greps for "all feature components" miss this feature, (c) the drift compounds — future component additions follow the same incomplete template.

---
title: README.md Tools section omits Field Management tool
severity: medium
tags: [drift, doc]
area: components
files: [README.md, src/app/(web)/tools/fieldmanagement]
discovered: 2026-04-17
discovered_by: components-field-management
status: open
---

## Problem
`README.md` documents three tools under its "Tools" section — **Address Labels**, **Template Editor**, and **Template Tool** — but does not document the Field Management tool at `/tools/fieldmanagement`. The feature has a full route, 10 component files, a test file, a dedicated service, and three stored procedures, yet is invisible in the public-facing README.

Two related sub-sections in `README.md` are also stale:
1. The "Project Structure" tree (`README.md:276-279`) lists `tools/addresslabels/`, `tools/template/`, and `tools/templateeditor/` but no `tools/fieldmanagement/`.
2. The "Components" block (`README.md:546-552`) and "Component Organization" block (`README.md:775-786`) list feature folders without `field-management/`.

## Evidence
- Route exists: `src/app/(web)/tools/fieldmanagement/page.tsx` and `field-management.tsx`.
- Feature folder: `src/components/field-management/` — 10 files (see `.claude/references/_meta/facts/2026-04-17.md:57`).
- Service: `src/services/fieldManagementService.ts` with `getPages`, `getPageFields`, `getTableMetadata`, `updatePageFieldOrder`.
- Stored procs: `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder` (facts snapshot 2026-04-17).
- Also note `README.md:28-31` Table of Contents lists only `Address Labels`, `Template Editor`, `Template Tool`, `Building Custom Tools` under "Tools".

## Proposed fix
1. Add a new `### Field Management` section under "Tools" (near line 400, before "Template Tool"):
   - Route: `/tools/fieldmanagement`
   - Purpose: Drag-and-drop editor for MP page field layout (order, grouping, required/hidden flags, label, default, filter, depends-on, writing-assistant).
   - Components: `PageSearch`, `FieldOrderEditor`, `SortableGroup`, `SortableFieldItem`, `NewGroupDialog`, plus the `useFieldOrderState` hook.
   - Stored procs: `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder`.
2. Add `field-management/` to the project-structure tree and the component-organization block.
3. Add `fieldmanagement/` to the `tools/` sub-tree.
4. Add `Field Management` to the Table of Contents.

## Impact if not fixed
External contributors landing on the README do not discover this tool; the component inventory in the README diverges further from reality every release; the README's test count ("241 test cases across 21 files") and Services table already drift from current state (507 tests / 37 files / 5 services) — adding another drift compounds trust issues.

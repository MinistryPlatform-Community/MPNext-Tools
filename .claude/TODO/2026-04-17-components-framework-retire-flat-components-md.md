---
title: Retire flat `.claude/references/components.md` after Phase 2 shards merge
severity: low
tags: [drift, doc]
area: components
files:
  - .claude/references/components.md
  - .claude/references/components/README.md
discovered: 2026-04-17
discovered_by: components-framework
status: open
---

## Problem
The new subfolder docs at `.claude/references/components/` (`README.md`, `tool-framework.md`, `layout.md`, `ui.md`, plus the sibling feature shards 12-17) supersede the flat `.claude/references/components.md` (12,413 bytes). Leaving both in the tree will cause drift — edits to one will not reach the other, and agents searching for component context may land on the stale flat doc.

## Evidence
- `.claude/references/components.md` exists and is 12,413 bytes (per `_meta/facts/2026-04-17.md`)
- `.claude/references/components/README.md` and three domain docs now exist (`tool-framework.md`, `layout.md`, `ui.md`)
- Same content will also be covered by Phase 2 shards 12-17 for the remaining feature folders

## Proposed fix
After all Phase 2 component shards (11-17) land and the subfolder index is complete:
1. Verify every section of `.claude/references/components.md` has a successor in `.claude/references/components/**/*.md`
2. Delete `.claude/references/components.md`
3. Update `.claude/references/INDEX.md` (if it links the flat file) to point at `components/README.md`

## Impact if not fixed
Two sources of truth for component docs — agents will get conflicting context and edits will drift apart silently.

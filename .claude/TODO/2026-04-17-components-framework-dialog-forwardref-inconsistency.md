---
title: `ui/dialog.tsx` mixes direct assignment and forwardRef patterns
severity: low
tags: [refactor]
area: components
files:
  - src/components/ui/dialog.tsx
discovered: 2026-04-17
discovered_by: components-framework
status: open
---

## Problem
`src/components/ui/dialog.tsx` uses a mix of direct assignment (function + variable) and `React.forwardRef` patterns for its parts, while sibling shadcn primitives (`tooltip.tsx`, `popover.tsx`, etc.) consistently use a single simpler pattern (plain function components typed via `React.ComponentProps<typeof RadixPart>`). This was flagged as a known inconsistency in the pre-existing flat `components.md` ("Known Issues & Recommendations") and has not been cleaned up.

## Evidence
- Pre-existing note: `.claude/references/components.md` line 180 — "dialog.tsx: Uses mixed patterns (direct assignment vs forwardRef) - works but inconsistent."
- Sibling files use plain functions: `src/components/ui/tooltip.tsx:8-15`, `21-29`, `31-35`, `37-59`

## Proposed fix
Regenerate the dialog primitive via `npx shadcn@latest add dialog --overwrite` (new-york style, current shadcn API uses plain-function components with `React.ComponentProps`). Re-run `npm run test:run` and `npm run lint` to confirm no regressions. Verify consumers: `dev-panel`, `group-wizard`, `template-editor`, `field-management`.

## Impact if not fixed
Cosmetic only — works today. But the inconsistency makes the file a confusing blueprint for contributors adding new primitives, and future shadcn CLI upgrades may overwrite it anyway.

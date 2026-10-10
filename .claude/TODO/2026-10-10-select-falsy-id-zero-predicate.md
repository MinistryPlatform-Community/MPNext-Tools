---
title: "Radix Select fields treat a lookup id of 0 as \"no selection\" (truthiness check instead of != null)"
severity: low
tags: [bug]
area: components
files: [src/components/group-wizard/step-attributes.tsx, src/components/group-wizard/step-identity.tsx, src/components/group-wizard/step-meeting.tsx, src/components/group-wizard/step-organization.tsx, src/app/(web)/tools/addeditfamily/add-edit-family.tsx]
discovered: 2026-09-13
discovered_by: coverage-review-orchestrator (follow-up carried over from the closed select-uncontrolled-to-controlled fix)
status: open
---

## Problem
The fourteen `Select` fields fixed on 2026-09-13 (they now stay controlled by
passing `""` for no selection) still decide whether anything is selected with a
truthiness check:

```tsx
value={field.value ? String(field.value) : ""}
```

`0` is falsy, so a lookup whose real id is `0` would render as "no selection"
and could not be shown as picked. No current MP lookup used here has an id of
0, so this can't happen today. It would fail silently the day one does.

## Evidence
- `src/components/group-wizard/step-meeting.tsx`, `step-attributes.tsx`,
  `step-organization.tsx`, `step-identity.tsx`: `field.value ? String(field.value) : ""`
- `src/app/(web)/tools/addeditfamily/add-edit-family.tsx` (~1168): the
  `value > 0 ? String(value) : ""` variant.

## Proposed fix
Use `field.value != null ? String(field.value) : ""`, and for add-edit-family
`value != null && value >= 0`. Check each lookup's real data first: some forms
may use `0` as a deliberate "none" sentinel, and those must keep showing the
placeholder. Add one test per file that a selected id of `0` renders as
selected.

## Impact if not fixed
None today. A future lookup with id 0 can't be shown as selected and looks unset.

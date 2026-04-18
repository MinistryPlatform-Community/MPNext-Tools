---
title: Group wizard edit mode does not seed contact/group display maps
severity: medium
tags: [bug]
area: components
files:
  - src/app/(web)/tools/groupwizard/group-wizard.tsx
  - src/components/group-wizard/actions.ts
  - src/services/groupService.ts
discovered: 2026-04-17
discovered_by: components-group-wizard
status: open
---

## Problem
The wizard tracks human-readable names for contact and group ID fields in two `Map<number, string>` structures held outside React Hook Form: `contactDisplayMap` and `groupDisplayMap` (`src/app/(web)/tools/groupwizard/group-wizard.tsx:51-52`). These maps are populated only through the `onContactSelect` / `onGroupSelect` callbacks fired by the `ContactSearch` / `GroupSearch` comboboxes (`group-wizard.tsx:86-94`).

When editing an existing group, `fetchGroupRecord` returns only the numeric IDs (`GroupWizardFormData` — `Primary_Contact: number`, `Parent_Group: number | null`, `Promote_to_Group: number | null`, `Descended_From: number | null`). `form.reset(result.data)` populates form values but the display maps remain empty. The result:

- Step 1 "Primary Contact" combobox trigger shows only the `User` icon with no name (the button renders `displayName` via `contactDisplayMap.get(field.value)` which is `undefined` — `step-organization.tsx:117`).
- Step 5 Review screen renders `ID: <n>` as a fallback (`step-review.tsx:141, 146, 218, 228`) until the user re-opens each combobox and re-selects.

Users editing an existing group have no way to see who the current primary contact is without re-searching.

## Evidence
- `src/components/group-wizard/actions.ts:51-63` — `fetchGroupRecord` delegates to `GroupService.getGroup(groupId)` and returns `GroupWizardFormData` (IDs only, no display names).
- `src/services/groupService.ts:173` — `getGroup` returns `GroupWizardFormData | null` (no display-name shape).
- `src/app/(web)/tools/groupwizard/group-wizard.tsx:69-84` — edit-mode effect calls `form.reset(result.data)` only; no population of `contactDisplayMap` / `groupDisplayMap`.
- `src/components/group-wizard/step-review.tsx:141` — `contactDisplayMap.get(data.Primary_Contact) ?? 'ID: ${data.Primary_Contact}'` confirms the fallback UX.

## Proposed fix
Option A (server): extend `GroupService.getGroup` to also return the related display names (e.g., `primaryContactName`, `parentGroupName`, `promoteToGroupName`, `descendedFromName`) alongside the form data. Adjust `fetchGroupRecord`'s return type to `{ success: true; data: GroupWizardFormData; displayNames: { contacts: Record<number, string>; groups: Record<number, string> } }`. The edit-mode effect seeds both maps before calling `form.reset`.

Option B (client): after `form.reset`, read the four ID fields and call a single new `fetchContactDisplayNames([contactId])` / `fetchGroupDisplayNames([groupIds])` action that returns `Map<number, string>` and merges into state.

Option A is preferred (one round trip, no client branching). Add test coverage via the tests proposed in `2026-04-17-components-group-wizard-missing-tests.md`.

## Impact if not fixed
Edit mode is functionally degraded — users cannot confirm the currently-selected primary contact, parent group, or promotion targets without opening a combobox and searching. Cognitive load increases and there is a real risk of a user accidentally replacing a correct contact because the field appeared empty.

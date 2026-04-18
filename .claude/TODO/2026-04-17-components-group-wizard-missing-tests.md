---
title: group-wizard has no component or action tests
severity: medium
tags: [missing-test]
area: components
files:
  - src/components/group-wizard/actions.ts
  - src/components/group-wizard/schema.ts
  - src/components/group-wizard/wizard-navigation.tsx
  - src/components/group-wizard/wizard-stepper.tsx
  - src/components/group-wizard/contact-search.tsx
  - src/components/group-wizard/group-search.tsx
  - src/app/(web)/tools/groupwizard/group-wizard.tsx
discovered: 2026-04-17
discovered_by: components-group-wizard
status: open
---

## Problem
`src/components/group-wizard/` contains 14 files (6 step components, 2 wizard chrome components, 2 typeahead comboboxes, schema, types, actions, barrel) plus the client shell `src/app/(web)/tools/groupwizard/group-wizard.tsx`. Zero test files exist under either path. This is the largest untested feature surface in `src/components/` — `GroupService` has tests (`src/services/groupService.test.ts`) but its consumers do not, so the auth gating, step-validation gating, edit-mode hydration, display-map behavior, and submit dispatch all depend on integration for regression signal.

## Evidence
- `Glob src/components/group-wizard/**/*.test.*` → no files.
- `Glob src/app/(web)/tools/groupwizard/**/*.test.*` → no files.
- Facts snapshot `.claude/references/_meta/facts/2026-04-17.md:101-141` lists 37 test files; none are under `group-wizard` or `tools/groupwizard`.
- Behavior not covered by existing tests:
  - `actions.ts` — `Unauthorized` throw on no session; `User GUID not found in session` throw when `userGuid` is absent (`actions.ts:19, 25`); short-circuit `[]` returns for sub-2-char search terms (`actions.ts:39, 46`).
  - `groupWizardSchema` — required-field messages, `Group_Name` max 75, `Description` max 2000, boolean defaults.
  - `group-wizard.tsx` — `handleNext` only advances when `form.trigger(STEP_FIELDS[currentStep])` passes; `handleStepClick` only allows navigation when step is completed or already past.
  - Edit mode — `fetchGroupRecord` success hydrates `form.reset(data)`; failure sets `loadError`.
  - `ContactSearch` / `GroupSearch` — 300ms debounce, `shouldFilter={false}`, clear-selection row for `GroupSearch` only.

## Proposed fix
Add the following tests, mirroring patterns from `src/services/groupService.test.ts` and `src/components/address-labels/actions.test.ts`:

1. **`src/components/group-wizard/actions.test.ts`**
   - Mock `@/lib/auth` (`auth.api.getSession`), `next/headers` (`headers()`), `@/services/groupService` and `@/services/userService` singletons.
   - Cover: `Unauthorized` when no session, `User GUID not found in session` when `userGuid` absent, `[]` returns for <2-char searches, happy paths for `createGroup` / `updateGroup` returning `{ success: true, groupId, groupName }`, error paths returning `ActionError`.

2. **`src/components/group-wizard/schema.test.ts`**
   - Validate `groupWizardSchema.safeParse(GROUP_WIZARD_DEFAULTS)` fails because required IDs are `undefined`, passes when filled.
   - Confirm `Group_Name` length bounds, `Description` length bound, `Secure_Check-in` bracket access, `STEP_FIELDS[5]` is `[]`.

3. **`src/app/(web)/tools/groupwizard/group-wizard.test.tsx`** (or co-located with components)
   - Render client shell with mocked actions.
   - Assert: Next button disabled stepping past validation failure; step click gating; `Create Another` resets form + step state; `fetchGroupRecord` failure renders the error Alert.

Unsaved-changes guard (`beforeunload` listener or `next/navigation` intercepting) is a separate UX issue — noted in `components/group-wizard.md` Gotchas.

## Impact if not fixed
Regression risk on every Next.js 16 / React 19 / Zod 4 / RHF 7 upgrade. Auth gating and `userGuid → MP user ID` resolution is security-adjacent and currently only exercised end-to-end; a silent regression could let unauthenticated writes through or break create/update for all users simultaneously.

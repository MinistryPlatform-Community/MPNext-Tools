---
title: Unreachable "empty STEP_FIELDS" branch in GroupWizard.handleNext
severity: low
tags: [refactor, missing-test]
area: components
files: [src/app/(web)/tools/groupwizard/group-wizard.tsx]
discovered: 2026-09-13
discovered_by: coverage-agent-group-wizard
status: open
---

## Problem
`handleNext` in `group-wizard.tsx` (lines 120-133) special-cases a step whose
`STEP_FIELDS[currentStep]` entry is missing or empty by skipping validation
and advancing immediately:

```ts
const fields = STEP_FIELDS[currentStep];
if (!fields || fields.length === 0) {
  setCompletedSteps((prev) => new Set(prev).add(currentStep));
  setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  return;
}
```

The only entry in `STEP_FIELDS` (see `schema.ts`) with an empty array is
index `5` (the Review step, `STEP_FIELDS[5] = []`). But `WizardNavigation`
never renders a "Next" button on the last step (`currentStep === totalSteps - 1`)
— it renders the Submit/"Save Changes" button instead, which calls
`handleSubmit`, not `handleNext`. `STEP_FIELDS` is otherwise fully populated
for indices 0-4, and `currentStep` never exceeds `WIZARD_STEPS.length - 1`
(5), so this branch is unreachable through the actual UI.

This isn't a security or correctness bug (nothing lets a user skip real
validation — the branch simply can never execute), but it is 3 statements of
dead defensive code that both inflates the file's apparent branch count and
cannot be exercised by any user-facing test, which is why coverage tooling
flags `group-wizard.tsx` at 94.5% statements instead of ≥95% despite every
reachable branch being covered.

## Evidence
- `src/app/(web)/tools/groupwizard/group-wizard.tsx:120-126` — the
  `!fields || fields.length === 0` branch.
- `src/components/group-wizard/schema.ts:58-65` — `STEP_FIELDS`, only index
  `5` is empty, and index 5 is the last step.
- `src/components/group-wizard/wizard-navigation.tsx:28,55-75` — `isReviewStep`
  gates rendering Submit vs. Next; the last step never shows the Next button
  that calls `handleNext`.
- `npx vitest run --coverage` on `group-wizard.tsx` reports lines 123-125
  uncovered even after `src/app/(web)/tools/groupwizard/group-wizard.test.tsx`
  was extended with 12 additional cases covering every other branch/function
  in the file (94.5% statements / 96.25% lines final).

## Proposed fix
Either:
1. Remove the `!fields || fields.length === 0` special case entirely (the
   `form.trigger([])` call with an empty array resolves `true` immediately
   in react-hook-form, so simplifying to always call `form.trigger(fields)`
   would behave identically and remove the dead branch), or
2. If the branch is meant as future-proofing for a step reachable via some
   other entry point, add a code comment explaining that intent so the next
   reader (and coverage tooling) doesn't flag it as untested dead code.

## Impact if not fixed
None functionally — this is a coverage/clarity issue, not a behavior bug.
Low priority; safe to leave as documented, known-dead code.

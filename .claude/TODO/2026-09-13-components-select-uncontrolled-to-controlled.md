---
title: Radix Select fields switched from uncontrolled to controlled on first selection
severity: medium
tags: [bug]
area: components
files: [src/components/group-wizard/step-attributes.tsx, src/components/group-wizard/step-identity.tsx, src/components/group-wizard/step-meeting.tsx, src/components/group-wizard/step-organization.tsx, src/app/(web)/tools/addeditfamily/add-edit-family.tsx]
discovered: 2026-09-13
discovered_by: coverage-review-orchestrator
status: resolved
---

## Problem
Fourteen `Select` fields across the group wizard and Add/Edit Family passed
`undefined` as their value while nothing was selected:

```tsx
value={field.value ? String(field.value) : undefined}
```

A Radix `Select` with `value={undefined}` is **uncontrolled**. As soon as the
user picked an option, `field.value` became truthy and the component received a
string — switching to **controlled** mid-life. React logs:

```
Select is changing from uncontrolled to controlled. Components should not
switch from controlled to uncontrolled (or vice versa). Decide between using
a controlled or uncontrolled value for the lifetime of the component.
```

Beyond the console noise, this is a real correctness problem: while the field
is uncontrolled, React state is not the source of truth for it. Programmatic
resets — `form.reset()` between wizard runs, or clearing a field back to its
empty value — are not guaranteed to be reflected in the rendered trigger,
because the component keeps its own internal value until it becomes controlled.

The falsy check compounds it. `field.value` of `0` is a legitimate lookup id in
Ministry Platform, and it is falsy, so a genuinely-selected id of 0 would also
have rendered as "no selection".

## Evidence
- `src/components/group-wizard/step-meeting.tsx:49,95,123,151`
- `src/components/group-wizard/step-attributes.tsx:70,98,126,154`
- `src/components/group-wizard/step-organization.tsx:59,87,162`
- `src/components/group-wizard/step-identity.tsx:64,128`
- `src/app/(web)/tools/addeditfamily/add-edit-family.tsx:1168`
  (variant: `value={value > 0 ? String(value) : undefined}`)
- Surfaced by the new step tests — 7 warnings per `vitest run`, e.g.
  `step-organization.test.tsx > StepOrganization > selects a congregation`.

## Fix applied
All fourteen sites now pass `""` instead of `undefined`:

```tsx
value={field.value ? String(field.value) : ""}
```

`""` is Radix's documented "no selection" value for a controlled `Select`: the
`SelectValue` placeholder still renders, and the component is controlled for
its entire lifetime. (`SelectItem` may not use `""` as its own value, which is
what makes it safe as the sentinel.)

Verified: 1,535 tests pass, `npm run test:run` emits zero warnings, `tsc
--noEmit` is clean, and `npm run build` succeeds.

## Follow-up worth considering
The `field.value ? ...` truthiness test is still wrong for a legitimate id of
`0`. No current lookup uses 0 as a real id, so this is latent rather than
live — but the correct predicate is `field.value != null`, and a future MP
lookup that does use 0 would fail silently. Left as-is here because changing
the predicate is a behavioural change beyond the warning fix, and it deserves
its own review against the actual lookup data.

---
title: Coverage config omitted `coverage.include`, hiding every untested file from the report
severity: high
tags: [bug, testing, drift]
area: testing
files: [vitest.config.mts, .github/workflows/test.yml]
discovered: 2026-09-13
discovered_by: coverage-review-orchestrator
status: resolved
---

## Problem
`vitest.config.mts` (then `vitest.config.ts`) configured v8 coverage without a `coverage.include` glob.
The v8 provider only instruments files that were actually loaded during the
test run, so any source file that no test imported was absent from the report
entirely rather than counted as 0%.

Note for anyone fixing this from memory or from an older guide: the flag that
used to do this was `coverage.all: true`, and it was **removed in Vitest 5**.
Setting it now is a TypeScript error (`No overload matches this call`) and has
no runtime effect — `coverage.include` is the only lever. This was verified
in-session: adding `all: true` alongside `include` changed nothing but the type
check, and removing it changed no coverage number.

The reported figure was therefore a percentage of *the code tests already
touch*, not of the codebase. It read 83.14% statements while true coverage over
`src/**` was 48.41%. 131 of 176 source files never appeared in the report at
all, including `src/services/familyService.ts` (756 lines, zero tests) and
`src/app/(web)/tools/layout.tsx` (the `/tools` authorization gate, zero tests).

CI uploads this report to Codecov, so the inflated number was the project's
published quality signal.

## Evidence
- `vitest.config.ts:15-24` (pre-fix, before the rename to `.mts`) — `coverage` block had `provider`,
  `reporter`, `exclude`, but no `all` and no `include`.
- `npx vitest run --coverage` before fix: `Statements : 83.14% ( 1845/2219 )`
- Same suite with `include: ['src/**/*.{ts,tsx}']`:
  `Statements : 48.41% ( 1845/3811 )` — identical numerator, denominator up 72%.
- Files absent from the pre-fix report despite existing: `familyService.ts`,
  `googlePlacesService.ts`, all of `src/components/template-editor/`, all of
  `src/app/(web)/tools/*/page.tsx`.

## Proposed fix
Applied. `vitest.config.mts` now sets `include: ['src/**/*.{ts,tsx}']`,
plus explicit exclusions for vendored
shadcn/ui primitives, generated MP models, build-time scripts, barrel files,
type-only modules, and declarative `loading.tsx` shells.

A second, related defect was found while applying this: directory exclusions
were written with a bare trailing slash (`'src/components/ui/'`), which matches
nothing. Those files stayed in the denominator until the patterns were
rewritten as `'src/components/ui/**'`. Any directory exclusion added here must
end in `**`.

Codecov will show a one-time drop from 83% to ~49% on the first push carrying
this change — before the new tests land on top of it. That is the correction,
not a regression.

## Impact if not fixed
Every coverage claim in `CLAUDE.md`, `.claude/references/testing/`, and Codecov
was overstating the tested share of the codebase by ~35 points. Untested
files stayed invisible, so no one could see that a 756-line service and a
route authorization gate had no tests at all.

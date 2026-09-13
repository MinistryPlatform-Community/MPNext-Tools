---
title: Add a type-check gate to CI (stale test fixtures had silently broken `npm run build`)
severity: medium
tags: [bug, testing, drift]
area: testing
files: [.github/workflows/test.yml, package.json]
discovered: 2026-09-13
discovered_by: coverage-review-orchestrator
status: open
---

## Problem
Two test files that are committed and unmodified on `dev` fail type checking.
`tsconfig.json` includes `**/*.ts` and `**/*.tsx`, `next.config.ts` sets no
`typescript.ignoreBuildErrors`, and `npm run build` runs `next build` — which
type-checks the project. So `npm run build` fails on a clean `dev` checkout.

This is invisible because, as `CLAUDE.md` already notes, CI runs only
`npm run test:coverage` and never `npm run build`. The tests themselves pass:
the arguments are wrong *types* but the mocked implementations never inspect
the missing fields, so the assertions still hold. Type safety is the only thing
catching it, and nothing automated runs type safety.

The underlying defect is that these tests assert against object shapes the
production types do not accept — `helper.test.ts` builds `CommunicationInfo`
and `MessageInfo` values out of raw MP column names (`Author_User_ID`,
`From_Contact`, `To_Contact_List`) instead of the camelCase DTO fields the
helper actually requires (`AuthorUserId`, `FromContactId`, `ReplyToContactId`,
`CommunicationType`, ...). A test that type-checks would have caught the drift;
these ones silently encode the wrong contract.

## Evidence
```
$ git status --porcelain src/lib/providers/ministry-platform/helper.test.ts \
    src/components/address-labels/word-document.test.ts
(no output — both unmodified)

$ npx tsc --noEmit
src/components/address-labels/word-document.test.ts(62,46): error TS1355:
  A 'const' assertion can only be applied to references to enum members, or
  string, number, boolean, array, or object literals.
src/lib/providers/ministry-platform/helper.test.ts(762,57): error TS2345:
  ... is missing the following properties from type 'CommunicationInfo':
  AuthorUserId, FromContactId, ReplyToContactId, CommunicationType, and 4 more.
src/lib/providers/ministry-platform/helper.test.ts(782,57): error TS2345: (same)
src/lib/providers/ministry-platform/helper.test.ts(822,49): error TS2345:
  ... is missing the following properties from type 'MessageInfo':
  FromAddress, ToAddresses
src/lib/providers/ministry-platform/helper.test.ts(841,49): error TS2345: (same)
src/lib/providers/ministry-platform/helper.test.ts(923,11): error TS2559:
  Type '{ IsDefault: boolean; Description: string; }' has no properties in
  common with type 'FileUploadParams'.
```
- `tsconfig.json` — `"include": ["**/*.ts", "**/*.tsx", ...]`, so tests are in
  the program.
- `next.config.ts` — no `typescript` block, so `ignoreBuildErrors` is false.
- `.github/workflows/test.yml` — runs `npm run test:coverage` only.

## Fixed in this branch
The stale fixtures have been corrected. `helper.test.ts` and `provider.test.ts`
now build real `CommunicationInfo` / `MessageInfo` / `FileUploadParams` /
`FileUpdateParams` values with explicit type annotations, so the compiler
enforces the shape, and the `as const` misuse at `word-document.test.ts:62` is
gone. `npx tsc --noEmit` is clean and all 96 tests in those files still pass.

## Remaining work
**Add a type-check gate to CI.** Add a `typecheck` script (`tsc --noEmit`) to
`package.json` and run it in `.github/workflows/test.yml` alongside
`test:coverage`.

`CLAUDE.md` documents "CI gates tests only ... Type-check locally" as the
mitigation. This issue is the evidence that the honour system did not hold: two
committed test files sat on `dev` in a state that broke `npm run build`, and
nothing caught it because the tests themselves passed — the arguments were the
wrong *types*, but the mocks never inspected the missing fields.

Note that the new `coverage.thresholds` in `vitest.config.mts` are enforced by
the existing `test:coverage` CI job, so coverage regressions now fail the build.
Type regressions still do not.

## Impact if not fixed
The specific breakage is repaired, but the gap that allowed it is still open. A
type error reaching `dev` breaks `npm run build` and therefore a Vercel
production deploy, while CI stays green — so it is found at deploy time by
whoever is shipping, not at PR time by whoever wrote it.

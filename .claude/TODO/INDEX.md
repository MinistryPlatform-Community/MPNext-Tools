---
title: TODO Index
type: index
last_updated: 2026-09-13
---

<!-- 2026-04-18: closed 3 routing TODOs (proxy-api-whitelist, signin-no-error-ui, home-page-roundtrip) — see commit fix(routing): tighten proxy API whitelist, add signin error UI, optimize /home redirect -->
<!-- 2026-04-18: closed 3 utils TODOs (imb-fallback-silent, tool-params-missing-test, tool-params-parseint-nan) — see commit fix(utils): log barcode fallbacks, guard tool-params NaN, add tool-params tests -->
<!-- 2026-04-18: closed 5 low TODOs (contexts-session-context-misnamed, dto-constants-batchsize-duplication, dto-constants-mailerid-not-validated, testing-claude-md-readme-counts-drift, verify-auth-oauth-flow) — see commit chore: rename contexts hook, dedupe BATCH_SIZE, validate mailerId, refresh docs -->
<!-- 2026-05-21: opened 1 critical TODO (xmldom-critical-vulnerability) — see install-testing feedback; address before next ship -->
<!-- 2026-05-21: closed 1 critical TODO (xmldom-critical-vulnerability) — replaced docxtemplater-image-module-free with maintained docxtemplater-image (uses @xmldom/xmldom@^0.9.7) -->
<!-- 2026-09-13: coverage push 49.67% -> 98.84% statements. Opened 8 TODOs, closed 2 (template-editor-missing-tests, coverage-report-masked-untested-files). -->


# TODO Index

Open TODOs from the context-engineering review (2026-04-17) and later additions.
Severity tiers:

- **critical**: security hole, data loss, auth bypass
- **high**: broken behavior, convention violation causing bugs
- **medium**: doc drift, missing test, refactor with real cost
- **low**: nits, minor doc fixes, stylistic improvements

Total: **4 open TODOs**.

> **2026-09-13 — unit-test coverage push.** Statement coverage over authored
> code went from 49.67% to 98.84% (3,610/3,652), lines to 99.70%, across 1,535
> tests in 116 files. Most of the items below were opened during that work,
> found by reading code while writing tests for it. A follow-up pass cleaned
> the runner output from 1,507 lines to 17 with zero warnings.
>
> **2026-09-13 (later) — remediation.** All three high-severity items and the
> CI gap are fixed and closed; see each file's Resolution section. CI now runs
> lint and `tsc --noEmit` as required steps, and installs with `npm ci`.
> Everything still open is `medium` or below, and all of it sits in
> `src/components`.

---

## By severity

### Critical (0)
_none open_

### High (0)
_none open_

### Medium (2)
| Area | Tags | Title | File |
|---|---|---|---|
| components | bug, drift | Template editor ignores pageID/recordID (no MP persistence) | [→](2026-04-17-components-template-editor-no-mp-persistence.md) |
| components | bug, refactor | Merge tokens `{{Field_Name}}` have no resolver anywhere | [→](2026-04-17-components-template-editor-merge-token-resolver.md) |

### Low (2)
| Area | Tags | Title | File |
|---|---|---|---|
| components | bug | Add/Edit Family search: "No contacts found" empty state never renders | [→](2026-09-13-search-empty-state-never-renders.md) |
| components | refactor, missing-test | Unreachable "empty STEP_FIELDS" branch in `GroupWizard.handleNext` | [→](2026-09-13-dead-empty-fields-branch-handlenext.md) |

---

## By tag

### security (0)
_none open_

### bug (3)
- components-template-editor-no-mp-persistence — medium
- components-template-editor-merge-token-resolver — medium
- search-empty-state-never-renders — low

### drift (1)
- components-template-editor-no-mp-persistence — medium

### missing-test (1)
- dead-empty-fields-branch-handlenext — low

### refactor (2)
- components-template-editor-merge-token-resolver — medium
- dead-empty-fields-branch-handlenext — low

### testing (0)
_none open_

### doc (0)
_none open_

### perf (0)
_none open_

---

## By area

| Area | Count |
|---|---|
| components | 4 |
| testing | 0 |
| services | 0 |
| auth | 0 |
| mp-provider | 0 |
| utils | 0 |
| routing | 0 |
| mp-schema | 0 |
| contexts | 0 |
| dto-constants | 0 |
| doc (cross-cutting) | 0 |

---

## Recently resolved

| Date | Title | File |
|---|---|---|
| 2026-09-13 | Coverage config omitted `coverage.include`, hiding every untested file | [→](2026-09-13-testing-coverage-report-masked-untested-files.md) |
| 2026-09-13 | No tests for `src/components/template-editor/` | [→](2026-04-17-components-template-editor-missing-tests.md) |
| 2026-09-13 | `vitest.config.ts` loaded as CommonJS (renamed to `.mts`) | [→](2026-09-13-testing-vitest-config-loaded-as-cjs.md) |
| 2026-09-13 | Radix Select fields switched uncontrolled -> controlled | [→](2026-09-13-components-select-uncontrolled-to-controlled.md) |
| 2026-09-13 | Unvalidated numeric fields reaching MP `$filter` strings | [→](2026-09-13-unvalidated-envelope-donor-ids-in-filter.md) |
| 2026-09-13 | `removeGroup` dropped a non-empty group's fields from the save payload | [→](2026-09-13-removegroup-order-guard-mismatch.md) |
| 2026-09-13 | Raw docxtemplater error logged household addresses | [→](2026-09-13-mergetemplate-logs-address-pii-on-error.md) |
| 2026-09-13 | `AddEditFamilyPage` logged the raw error object | [→](2026-09-13-page-logs-raw-error-object.md) |
| 2026-09-13 | No type-check gate in CI (also `npm ci`, lint, concurrency) | [→](2026-09-13-testing-no-typecheck-gate-in-ci.md) |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`,
`area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

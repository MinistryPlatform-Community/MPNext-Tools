---
title: TODO Index
type: index
last_updated: 2026-09-30
---

<!-- 2026-04-18: closed 3 routing TODOs (proxy-api-whitelist, signin-no-error-ui, home-page-roundtrip) — see commit fix(routing): tighten proxy API whitelist, add signin error UI, optimize /home redirect -->
<!-- 2026-04-18: closed 3 utils TODOs (imb-fallback-silent, tool-params-missing-test, tool-params-parseint-nan) — see commit fix(utils): log barcode fallbacks, guard tool-params NaN, add tool-params tests -->
<!-- 2026-04-18: closed 5 low TODOs (contexts-session-context-misnamed, dto-constants-batchsize-duplication, dto-constants-mailerid-not-validated, testing-claude-md-readme-counts-drift, verify-auth-oauth-flow) — see commit chore: rename contexts hook, dedupe BATCH_SIZE, validate mailerId, refresh docs -->
<!-- 2026-05-21: opened 1 critical TODO (xmldom-critical-vulnerability) — see install-testing feedback; address before next ship -->
<!-- 2026-05-21: closed 1 critical TODO (xmldom-critical-vulnerability) — replaced docxtemplater-image-module-free with maintained docxtemplater-image (uses @xmldom/xmldom@^0.9.7) -->
<!-- 2026-09-30: playbook audit (5 MPNext port playbooks) opened 14 TODOs: 9 remediation steps, 2 ops, 3 held. -->
<!-- 2026-09-30: closed 1 critical TODO (step1 F12/F3b) — see fix/step1-f12-f3b-signin-hardening PR. -->
<!-- 2026-09-30: closed 1 high TODO (step2 authz + input validation) — see fix/step2-authz-input-validation PR. -->
<!-- 2026-09-13: coverage push 49.67% -> 98.84% statements. Opened 8 TODOs, closed 2 (template-editor-missing-tests, coverage-report-masked-untested-files). -->


# TODO Index

Open TODOs from the context-engineering review (2026-04-17) and later additions.
Severity tiers:

- **critical**: security hole, data loss, auth bypass
- **high**: broken behavior, convention violation causing bugs
- **medium**: doc drift, missing test, refactor with real cost
- **low**: nits, minor doc fixes, stylistic improvements

Total: **15 open TODOs**.

> **2026-09-30 — MPNext playbook audit.** The five `S:\MP\MPNext\.claude\playbooks`
> port playbooks were audited against this fork. Remediation is split into nine
> ordered steps (`step1`…`step9`, one PR each), two ops actions the owner performs
> in Vercel, and three held items awaiting owner decisions.

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

### High (3)
| Area | Tags | Title | File |
|---|---|---|---|
| auth | security, missing-test, doc | Step 4 — OIDC lazy discovery, sub binding, dedicated OIDC client, sign-out | [→](2026-09-30-step4-oidc-lazy-discovery-and-sub-binding.md) |
| auth | security, doc | Ops — Rotate BETTER_AUTH_SECRET; advise downstream clones | [→](2026-09-30-ops-rotate-better-auth-secret.md) |
| auth | security, doc | Ops — Set MP_SECURITY_ROLES=* in every environment | [→](2026-09-30-ops-set-mp-security-roles-env.md) |

### Medium (7)
| Area | Tags | Title | File |
|---|---|---|---|
| mp-provider | security, missing-test | Step 5 — MP HTTP client and provider hardening | [→](2026-09-30-step5-mp-http-client-and-provider-hardening.md) |
| routing | security, drift | Step 6 — Headers, next.config, server-only, prerender + build in CI | [→](2026-09-30-step6-headers-csp-build-guards.md) |
| services | drift, missing-test | Step 7 — Write-audit gaps and datetime drift cleanup | [→](2026-09-30-step7-write-audit-and-datetime-cleanup.md) |
| routing | security, doc | Held — CSP notes for customer-deployed clones | [→](2026-09-30-held-csp-customer-deployments.md) |
| mp-provider | security | Held — Deny-all stored-procedure allowlist | [→](2026-09-30-held-stored-procedure-allowlist.md) |
| components | bug, drift | Template editor ignores pageID/recordID (no MP persistence) | [→](2026-04-17-components-template-editor-no-mp-persistence.md) |
| components | bug, refactor | Merge tokens `{{Field_Name}}` have no resolver anywhere | [→](2026-04-17-components-template-editor-merge-token-resolver.md) |

### Low (5)
| Area | Tags | Title | File |
|---|---|---|---|
| components | security, bug | Step 8 — Address-label caps, error boundaries, tool-params decode, codegen escaping | [→](2026-09-30-step8-fork-specific-low-risk-items.md) |
| commands | security, doc | Step 9 — CI supply chain, setup env writer, docs | [→](2026-09-30-step9-ci-setup-and-docs.md) |
| commands | security, doc | Held — GitHub repo security settings | [→](2026-09-30-held-github-repo-security-settings.md) |
| components | bug | Add/Edit Family search: "No contacts found" empty state never renders | [→](2026-09-13-search-empty-state-never-renders.md) |
| components | refactor, missing-test | Unreachable "empty STEP_FIELDS" branch in `GroupWizard.handleNext` | [→](2026-09-13-dead-empty-fields-branch-handlenext.md) |

---

## By tag

### security (10)
- all open 2026-09-30 step/ops/held items except step7 (step1, step2, step3 resolved)

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
| 2026-09-30 | Step 3 — 12 h session ceiling, JWE cookie, no user OAuth tokens, boot guards + env.ts, secrets hygiene, client-IP header | [→](2026-09-30-step3-session-lifetime-and-secrets-hygiene.md) |
| 2026-09-30 | Step 2 — Fail-closed MP_SECURITY_ROLES, group-wizard mass assignment, page-metadata injection, F11, page self-gating, filter/error hygiene | [→](2026-09-30-step2-authorization-and-input-validation.md) |
| 2026-09-30 | Step 1 — F12 id_token sign-in refused, F3b callbackUrl bypass closed, /sign-in/social boundary + no-store | [→](2026-09-30-step1-close-live-auth-holes-f12-f3b.md) |
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

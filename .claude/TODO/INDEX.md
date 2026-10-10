---
title: TODO Index
type: index
last_updated: 2026-10-10
---

# TODO Index

This folder lists **open work only**. When a TODO is finished, or we decide not
to do it, its file is **deleted**, not marked resolved. The commit that removes
it is the record (`git log --diff-filter=D -- .claude/TODO/`). See
[`SCHEMA.md`](SCHEMA.md) § Lifecycle.

Severity tiers:

- **critical**: security hole, data loss, auth bypass
- **high**: broken behavior, convention violation causing bugs
- **medium**: doc drift, missing test, refactor with real cost
- **low**: nits, minor doc fixes, stylistic improvements

Total: **14 open TODOs**.

> **Start here for owner (non-code) work:** [`2026-10-10-owner-ops-checklist-before-release.md`](2026-10-10-owner-ops-checklist-before-release.md)
> collects every env-var, MP and GitHub setting to do before and right after the next `/release`.

> **`step6`…`step9`** are the remaining steps from the 2026-09-30 MPNext playbook
> audit (one PR each). `held-*` items wait on an owner decision.

---

## By severity

### Critical (0)
_none open_

### High (3)
| Area | Tags | Title | File |
|---|---|---|---|
| auth | security, doc | Owner checklist — settings to do before/after the next /release | [→](2026-10-10-owner-ops-checklist-before-release.md) |
| auth | security, doc | Ops — Rotate BETTER_AUTH_SECRET; advise downstream clones | [→](2026-09-30-ops-rotate-better-auth-secret.md) |
| auth | security, doc | Ops — Set MP_SECURITY_ROLES=* in every environment | [→](2026-09-30-ops-set-mp-security-roles-env.md) |

### Medium (4)
| Area | Tags | Title | File |
|---|---|---|---|
| routing | security, drift | Step 6 — Headers, next.config, server-only, prerender + build in CI | [→](2026-09-30-step6-headers-csp-build-guards.md) |
| services | drift, missing-test | Step 7 — Write-audit gaps and datetime drift cleanup | [→](2026-09-30-step7-write-audit-and-datetime-cleanup.md) |
| routing | security, doc | Held — CSP notes for customer-deployed clones | [→](2026-09-30-held-csp-customer-deployments.md) |
| mp-provider | security | Held — Deny-all stored-procedure allowlist | [→](2026-09-30-held-stored-procedure-allowlist.md) |

### Low (7)
| Area | Tags | Title | File |
|---|---|---|---|
| components | security, bug | Step 8 — Address-label caps, error boundaries, tool-params decode, codegen escaping | [→](2026-09-30-step8-fork-specific-low-risk-items.md) |
| commands | security, doc | Step 9 — CI supply chain, setup env writer, docs | [→](2026-09-30-step9-ci-setup-and-docs.md) |
| commands | security, doc | Held — GitHub repo security settings | [→](2026-09-30-held-github-repo-security-settings.md) |
| components | bug | Add/Edit Family search: "No contacts found" empty state never renders | [→](2026-09-13-search-empty-state-never-renders.md) |
| components | refactor, missing-test | Unreachable "empty STEP_FIELDS" branch in `GroupWizard.handleNext` | [→](2026-09-13-dead-empty-fields-branch-handlenext.md) |
| components | bug | Select fields treat a lookup id of 0 as "no selection" | [→](2026-10-10-select-falsy-id-zero-predicate.md) |
| services | security | `ToolService.resolveContactIds` takes table/column names from its caller (dev panel) | [→](2026-10-10-dev-panel-resolvecontactids-caller-identifiers.md) |

---

## By tag

### security (10)
- owner-ops-checklist-before-release — high
- ops-rotate-better-auth-secret — high
- ops-set-mp-security-roles-env — high
- step6-headers-csp-build-guards — medium
- held-csp-customer-deployments — medium
- held-stored-procedure-allowlist — medium
- step8-fork-specific-low-risk-items — low
- step9-ci-setup-and-docs — low
- held-github-repo-security-settings — low
- dev-panel-resolvecontactids-caller-identifiers — low

### bug (3)
- step8-fork-specific-low-risk-items — low
- search-empty-state-never-renders — low
- select-falsy-id-zero-predicate — low

### drift (2)
- step6-headers-csp-build-guards — medium
- step7-write-audit-and-datetime-cleanup — medium

### missing-test (2)
- step7-write-audit-and-datetime-cleanup — medium
- dead-empty-fields-branch-handlenext — low

### refactor (1)
- dead-empty-fields-branch-handlenext — low

### doc (6)
- owner-ops-checklist-before-release — high
- ops-rotate-better-auth-secret — high
- ops-set-mp-security-roles-env — high
- held-csp-customer-deployments — medium
- step9-ci-setup-and-docs — low
- held-github-repo-security-settings — low

### perf (0)
_none open_

---

## By area

| Area | Count |
|---|---|
| components | 4 |
| auth | 3 |
| routing | 2 |
| commands | 2 |
| services | 2 |
| mp-provider | 1 |
| testing | 0 |
| utils | 0 |
| mp-schema | 0 |
| contexts | 0 |
| dto-constants | 0 |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`,
`area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

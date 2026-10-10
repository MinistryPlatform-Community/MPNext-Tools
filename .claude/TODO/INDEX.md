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

Total: **6 open TODOs**.

> **`step6`** and **`step8`** are the remaining steps from the 2026-09-30 MPNext
> playbook audit (one PR each). `held-*` items wait on an owner decision.

---

## By severity

### Critical (0)
_none open_

### High (0)
_none open_

### Medium (2)
| Area | Tags | Title | File |
|---|---|---|---|
| routing | security, drift | Step 6 — Headers, next.config, server-only, prerender + build in CI | [→](2026-09-30-step6-headers-csp-build-guards.md) |
| routing | security, doc | Held — CSP notes for customer-deployed clones | [→](2026-09-30-held-csp-customer-deployments.md) |

### Low (4)
| Area | Tags | Title | File |
|---|---|---|---|
| components | security, bug | Step 8 — Address-label caps, error boundaries, tool-params decode, codegen escaping | [→](2026-09-30-step8-fork-specific-low-risk-items.md) |
| components | bug | Add/Edit Family search: "No contacts found" empty state never renders | [→](2026-09-13-search-empty-state-never-renders.md) |
| components | refactor, missing-test | Unreachable "empty STEP_FIELDS" branch in `GroupWizard.handleNext` | [→](2026-09-13-dead-empty-fields-branch-handlenext.md) |
| services | security | `ToolService.resolveContactIds` takes table/column names from its caller (dev panel) | [→](2026-10-10-dev-panel-resolvecontactids-caller-identifiers.md) |

---

## By tag

### security (4)
- step6-headers-csp-build-guards — medium
- held-csp-customer-deployments — medium
- step8-fork-specific-low-risk-items — low
- dev-panel-resolvecontactids-caller-identifiers — low

### bug (2)
- step8-fork-specific-low-risk-items — low
- search-empty-state-never-renders — low

### drift (1)
- step6-headers-csp-build-guards — medium

### missing-test (1)
- dead-empty-fields-branch-handlenext — low

### refactor (1)
- dead-empty-fields-branch-handlenext — low

### doc (1)
- held-csp-customer-deployments — medium

### perf (0)
_none open_

---

## By area

| Area | Count |
|---|---|
| components | 3 |
| routing | 2 |
| services | 1 |
| auth | 0 |
| commands | 0 |
| mp-provider | 0 |
| testing | 0 |
| utils | 0 |
| mp-schema | 0 |
| contexts | 0 |
| dto-constants | 0 |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`,
`area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

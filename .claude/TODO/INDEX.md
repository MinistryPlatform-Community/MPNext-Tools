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

Total: **2 open TODOs**.

> **`step6`** is the remaining step from the 2026-09-30 MPNext playbook audit.
> `held-*` items wait on an owner decision.

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

### Low (0)
_none open_

---

## By tag

### security (2)
- step6-headers-csp-build-guards — medium
- held-csp-customer-deployments — medium

### bug (0)
_none open_

### drift (1)
- step6-headers-csp-build-guards — medium

### missing-test (0)
_none open_

### refactor (0)
_none open_

### doc (1)
- held-csp-customer-deployments — medium

### perf (0)
_none open_

---

## By area

| Area | Count |
|---|---|
| components | 0 |
| routing | 2 |
| services | 0 |
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

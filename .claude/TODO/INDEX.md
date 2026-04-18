---
title: TODO Index
type: index
last_updated: 2026-04-18
---

<!-- 2026-04-18: closed 3 routing TODOs (proxy-api-whitelist, signin-no-error-ui, home-page-roundtrip) — see commit fix(routing): tighten proxy API whitelist, add signin error UI, optimize /home redirect -->


# TODO Index

All open TODOs dropped during the context-engineering review (2026-04-17) and any later additions. Severity tiers:

- **critical**: security hole, data loss, auth bypass
- **high**: broken behavior, convention violation causing bugs
- **medium**: doc drift, missing test, refactor with real cost
- **low**: nits, minor doc fixes, stylistic improvements

Total: **11 open TODOs**.

---

## By severity

### Critical
_none open_

### High
_none open_

### Medium (5)
| Area | Tags | Title | File |
|---|---|---|---|
| components | bug, drift | Template editor ignores pageID/recordID (no MP persistence) | [→](2026-04-17-components-template-editor-no-mp-persistence.md) |
| components | bug, refactor | Merge tokens `{{Field_Name}}` have no resolver anywhere | [→](2026-04-17-components-template-editor-merge-token-resolver.md) |
| components | missing-test | No tests for `src/components/template-editor/` | [→](2026-04-17-components-template-editor-missing-tests.md) |
| utils | bug, refactor | IMb encoding errors silently fall back to POSTNET | [→](2026-04-17-utils-imb-fallback-silent.md) |
| utils | missing-test | Missing test file for `tool-params.ts` | [→](2026-04-17-utils-tool-params-missing-test.md) |

### Low (6)
| Area | Tags | Title | File |
|---|---|---|---|
| auth | — | auth — oauth-flow.md references a missing PKCE TODO file | [→](2026-04-17-verify-auth-oauth-flow.md) |
| contexts | refactor, doc | Rename `session-context.tsx` — it's a hook module, not a Context | [→](2026-04-17-contexts-session-context-misnamed.md) |
| doc | doc, drift | CLAUDE.md and README.md report stale test counts (241/21) | [→](2026-04-17-testing-claude-md-readme-counts-drift.md) |
| dto-constants | refactor, drift | Dedupe two independent `BATCH_SIZE = 100` constants | [→](2026-04-17-dto-constants-batchsize-duplication.md) |
| dto-constants | refactor | `LabelConfig.mailerId` lacks runtime validation | [→](2026-04-17-dto-constants-mailerid-not-validated.md) |
| utils | bug | `parseToolParams` leaks `NaN` for non-numeric query params | [→](2026-04-17-utils-tool-params-parseint-nan.md) |

---

## By tag

### security (0)
_none open_

### bug (4)
_see severity sections above; tag appears on items involving a functional defect_

### drift (4)
_doc-to-code or doc-to-doc divergence; mostly resolved inline by Phase 4 verification_

### missing-test (2)
- components-template-editor-missing-tests — medium
- utils-tool-params-missing-test — medium

### refactor (5)
_improvements with real value but no functional defect_

### doc (3)
_documentation-only tasks, mostly retiring old flat files or updating CLAUDE.md / README.md_

### perf (0)
_none open_

---

## By area

| Area | Count |
|---|---|
| components | 3 |
| auth | 1 |
| mp-provider | 0 |
| services | 0 |
| utils | 3 |
| routing | 0 |
| mp-schema | 0 |
| testing | 0 |
| contexts | 1 |
| dto-constants | 2 |
| doc (cross-cutting) | 1 |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`, `area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

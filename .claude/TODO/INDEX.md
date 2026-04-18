---
title: TODO Index
type: index
last_updated: 2026-04-17
---

# TODO Index

All open TODOs dropped during the context-engineering review (2026-04-17) and any later additions. Severity tiers:

- **critical**: security hole, data loss, auth bypass
- **high**: broken behavior, convention violation causing bugs
- **medium**: doc drift, missing test, refactor with real cost
- **low**: nits, minor doc fixes, stylistic improvements

Total: **39 open TODOs** at baseline.

---

## By severity

### Critical
_none open_

### High
_none open_

### Medium (14)
| Area | Tags | Title | File |
|---|---|---|---|
| auth | bug, security | `handleSignOut` silently falls back to `http://localhost:3000` | [→](2026-04-17-auth-localhost-fallback-signout.md) |
| auth | doc, drift | Retire flat `.claude/references/auth.md` | [→](2026-04-17-auth-retire-flat-auth-md.md) |
| auth | missing-test | No test coverage for `/signin` page OAuth redirect | [→](2026-04-17-auth-missing-signin-page-test.md) |
| components | bug, drift | Template editor ignores pageID/recordID (no MP persistence) | [→](2026-04-17-components-template-editor-no-mp-persistence.md) |
| components | bug, refactor | Merge tokens `{{Field_Name}}` have no resolver anywhere | [→](2026-04-17-components-template-editor-merge-token-resolver.md) |
| components | bug, security | Sign-out silently falls back to localhost when env unset | [→](2026-04-17-components-user-menu-localhost-fallback.md) |
| components | bug | Group wizard edit mode does not seed contact/group display maps | [→](2026-04-17-components-group-wizard-display-map-edit-mode.md) |
| components | drift, doc | CLAUDE.md Component Organization omits `field-management/` | [→](2026-04-17-components-field-management-claudemd-missing.md) |
| components | drift, doc | README.md Tools section omits Field Management tool | [→](2026-04-17-components-field-management-readme-missing.md) |
| components | missing-test | group-wizard has no component or action tests | [→](2026-04-17-components-group-wizard-missing-tests.md) |
| components | missing-test | No tests for `src/components/template-editor/` | [→](2026-04-17-components-template-editor-missing-tests.md) |
| mp-provider | refactor, perf | `ensureValidToken` has no concurrent-call deduplication | [→](2026-04-17-mp-provider-token-refresh-no-dedup.md) |
| mp-schema | drift, doc | required-stored-procs.md missing `api_MPNextTools_*` + `api_dev_DeployTool` | [→](2026-04-17-services-required-procs-doc-incomplete.md) |
| routing | security, refactor | Proxy public-path whitelist blanket-allows all `/api/*` | [→](2026-04-17-routing-proxy-api-whitelist-too-broad.md) |
| services | drift, doc | services.md DTO table drifts from actual DTO shapes | [→](2026-04-17-dto-constants-services-md-drift.md) |
| services | security, bug | `getAddressForContact` does not validate `contactId` | [→](2026-04-17-services-get-address-for-contact-unvalidated.md) |
| utils | bug, refactor | IMb encoding errors silently fall back to POSTNET | [→](2026-04-17-utils-imb-fallback-silent.md) |
| utils | missing-test | Missing test file for `tool-params.ts` | [→](2026-04-17-utils-tool-params-missing-test.md) |

### Low (21)
| Area | Tags | Title | File |
|---|---|---|---|
| auth | — | auth — oauth-flow.md references a missing PKCE TODO file | [→](2026-04-17-verify-auth-oauth-flow.md) |
| components | bug, refactor | Household dedup silently skipped when `Household_ID` is null | [→](2026-04-17-components-address-labels-no-household-dedup-null-id.md) |
| components | drift, doc | Retire flat `.claude/references/components.md` | [→](2026-04-17-components-framework-retire-flat-components-md.md) |
| components | missing-test, drift | POSTNET barcode test uses malformed input | [→](2026-04-17-components-address-labels-weak-postnet-test.md) |
| components | missing-test | No render/interaction test for `UserMenu` | [→](2026-04-17-components-user-menu-missing-render-test.md) |
| components | refactor | `ui/dialog.tsx` mixes direct assignment and forwardRef patterns | [→](2026-04-17-components-framework-dialog-forwardref-inconsistency.md) |
| components | security, refactor | Dev-panel non-deploy server actions lack `NODE_ENV` guard | [→](2026-04-17-components-dev-panel-prod-guard-gap.md) |
| contexts | refactor, doc | Rename `session-context.tsx` — it's a hook module, not a Context | [→](2026-04-17-contexts-session-context-misnamed.md) |
| doc | doc, drift | CLAUDE.md and README.md report stale test counts (241/21) | [→](2026-04-17-testing-claude-md-readme-counts-drift.md) |
| dto-constants | refactor, drift | Dedupe two independent `BATCH_SIZE = 100` constants | [→](2026-04-17-dto-constants-batchsize-duplication.md) |
| dto-constants | refactor | `LabelConfig.mailerId` lacks runtime validation | [→](2026-04-17-dto-constants-mailerid-not-validated.md) |
| mp-provider | drift, doc | Provider `docs/README.md` lists nonexistent `auth-provider.ts` | [→](2026-04-17-mp-provider-stale-docs-readme.md) |
| mp-provider | drift, missing-test | CommunicationService test fixture uses wrong casing | [→](2026-04-17-mp-provider-services-communication-fixture-shape-mismatch.md) |
| mp-provider | refactor, bug | HttpClient error messages inconsistently include response body | [→](2026-04-17-mp-provider-http-client-inconsistent-error-body.md) |
| mp-provider | refactor, bug | MPHelper Zod rewrap drops structured issue list | [→](2026-04-17-mp-provider-helper-loses-zod-issue-list.md) |
| routing | bug, refactor | `/signin` silently retries OAuth on getSession failure, no error UI | [→](2026-04-17-routing-signin-no-error-ui.md) |
| routing | refactor, perf | `/home` redirect page sits inside `(web)`, forces auth roundtrip | [→](2026-04-17-routing-home-page-unnecessary-auth-roundtrip.md) |
| services | doc, drift | `getSelectionRecordIds` JSDoc references wrong SP name | [→](2026-04-17-services-stale-cloudtools-comment.md) |
| services | drift, doc | (duplicate of above — dev-panel-toolservice-comment-drift) | [→](2026-04-17-components-dev-panel-toolservice-comment-drift.md) |
| testing | doc, drift | Remove or redirect stale flat `testing.md` | [→](2026-04-17-testing-remove-stale-flat-doc.md) |
| utils | bug | `parseToolParams` leaks `NaN` for non-numeric query params | [→](2026-04-17-utils-tool-params-parseint-nan.md) |

---

## By tag

### security (5)
- [auth-localhost-fallback-signout](2026-04-17-auth-localhost-fallback-signout.md) — medium
- [components-user-menu-localhost-fallback](2026-04-17-components-user-menu-localhost-fallback.md) — medium
- [routing-proxy-api-whitelist-too-broad](2026-04-17-routing-proxy-api-whitelist-too-broad.md) — medium
- [services-get-address-for-contact-unvalidated](2026-04-17-services-get-address-for-contact-unvalidated.md) — medium
- [components-dev-panel-prod-guard-gap](2026-04-17-components-dev-panel-prod-guard-gap.md) — low

### bug (13)
_see severity sections above; tag appears on items involving a functional defect_

### drift (13)
_doc-to-code or doc-to-doc divergence; mostly resolved inline by Phase 4 verification_

### missing-test (8)
- auth-missing-signin-page-test — medium
- components-group-wizard-missing-tests — medium
- components-template-editor-missing-tests — medium
- utils-tool-params-missing-test — medium
- components-address-labels-weak-postnet-test — low
- components-user-menu-missing-render-test — low
- mp-provider-services-communication-fixture-shape-mismatch — low

### refactor (13)
_improvements with real value but no functional defect_

### doc (11)
_documentation-only tasks, mostly retiring old flat files or updating CLAUDE.md / README.md_

### perf (2)
- mp-provider-token-refresh-no-dedup — medium
- routing-home-page-unnecessary-auth-roundtrip — low

---

## By area

| Area | Count |
|---|---|
| components | 14 |
| auth | 4 |
| mp-provider | 5 |
| services | 4 |
| utils | 3 |
| routing | 3 |
| mp-schema | 1 |
| testing | 1 |
| contexts | 1 |
| dto-constants | 2 |
| doc (cross-cutting) | 1 |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`, `area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

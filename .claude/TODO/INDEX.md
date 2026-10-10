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

Total: **5 open TODOs**.

---

## By severity

### Critical (0)
_none open_

### High (1)
- [Generated Zod schemas reject MP wall-clock datetimes](2026-10-10-generated-zod-rejects-mp-datetimes.md) — mp-provider

### Medium (1)
- [FieldManagementService.getTableMetadata matches on Table_Name, API returns Name](2026-10-10-fieldmanagement-table-name-match.md) — services

### Low (3)
- [GooglePlacesService reads MP config with no gate or in-file carve-out](2026-10-10-googleplaces-ungated-config-read.md) — services
- [UserProvider fetches a profile nothing reads](2026-10-10-userprovider-has-no-consumers.md) — contexts
- [Schema/stored-proc generators write to pre-reorg doc paths](2026-10-10-generators-write-old-doc-paths.md) — mp-provider

---

## By tag

### security (1)
- [GooglePlacesService reads MP config with no gate or in-file carve-out](2026-10-10-googleplaces-ungated-config-read.md) — services

### bug (2)
- [Generated Zod schemas reject MP wall-clock datetimes](2026-10-10-generated-zod-rejects-mp-datetimes.md) — mp-provider
- [FieldManagementService.getTableMetadata matches on Table_Name, API returns Name](2026-10-10-fieldmanagement-table-name-match.md) — services

### drift (1)
- [Schema/stored-proc generators write to pre-reorg doc paths](2026-10-10-generators-write-old-doc-paths.md) — mp-provider

### missing-test (0)
_none open_

### refactor (1)
- [UserProvider fetches a profile nothing reads](2026-10-10-userprovider-has-no-consumers.md) — contexts

### doc (1)
- [GooglePlacesService reads MP config with no gate or in-file carve-out](2026-10-10-googleplaces-ungated-config-read.md) — services

### perf (1)
- [UserProvider fetches a profile nothing reads](2026-10-10-userprovider-has-no-consumers.md) — contexts

---

## By area

| Area | Count |
|---|---|
| components | 0 |
| routing | 0 |
| services | 2 |
| auth | 0 |
| commands | 0 |
| mp-provider | 2 |
| testing | 0 |
| utils | 0 |
| mp-schema | 0 |
| contexts | 1 |
| dto-constants | 0 |
| data-flow | 0 |
| security | 0 |

---

## Schema
Every TODO follows [`SCHEMA.md`](SCHEMA.md) with required `severity`, `tags`,
`area`, `files`, `discovered`, `discovered_by`, `status` frontmatter.

---
title: Reference Index
type: index
last_updated: 2026-10-10
---

# Reference Index

Agent-facing navigation map for MPNext-Tools. For each question pattern, find the target doc. This is the canonical entry point for Claude (and any AI agent) working on this project — `README.md` is the human entry point.

## Quick lookup

| If you need to... | Read |
|---|---|
| Understand OAuth, sessions, or route protection | [auth/README.md](auth/README.md) |
| Check who may use a tool, the endpoint surface, CSP/headers, or security findings | [security/README.md](security/README.md) |
| Distinguish `session.user.id` from `userGuid` | [auth/user-identity.md](auth/user-identity.md) |
| Trace the MP provider / API client stack | [mp-provider/README.md](mp-provider/README.md) |
| Look up an MP service (table, procedure, file, etc.) | [mp-provider/services/](mp-provider/services/) |
| Verify an MP table schema or stored procedure | [mp-schema/README.md](mp-schema/README.md) |
| See which MP tables/FKs the app actually touches | [mp-schema/data-model-map.md](mp-schema/data-model-map.md) |
| Understand an app service's role or query patterns | [services/README.md](services/README.md) |
| Avoid MP query pitfalls (ambiguous columns, FK traversal, escaping) | [services/query-patterns.md](services/query-patterns.md) |
| Send or read an MP date/datetime (`DomainTimezoneService`) | [ministryplatform.datetimehandling.md](ministryplatform.datetimehandling.md) |
| Find a component's location or role | [components/README.md](components/README.md) |
| Understand the Tool framework (ToolContainer, header, footer) | [components/tool-framework.md](components/tool-framework.md) |
| Understand a React context (UserProvider, useAppSession) | [contexts/README.md](contexts/README.md) |
| Understand Next.js 16 proxy / routing / route groups | [routing/README.md](routing/README.md) |
| See the end-to-end stack trace for a key flow | [data-flow/call-graphs.md](data-flow/call-graphs.md) |
| See every error by origin layer | [data-flow/error-catalog.md](data-flow/error-catalog.md) |
| Write a test (server action, service, component, OAuth) | [testing/cookbook.md](testing/cookbook.md) |
| Set up Vitest or fix a mock pattern | [testing/setup.md](testing/setup.md), [testing/mocks.md](testing/mocks.md) |
| Find a DTO or shared constant | [dto-constants/README.md](dto-constants/README.md) |
| Look up barcode, label-stock, or tool-param utilities | [utils/README.md](utils/README.md) |
| Upgrade dependencies / check what is held back | [../packages/README.md](../packages/README.md) (newest dated file), [../commands/update-deps.md](../commands/update-deps.md) |
| Scaffold a tool or stored proc, or cut a release | [../commands/](../commands/) (`newtool`, `newstoredproc`, `release`, `update-deps`) |
| Port a past fix into a derived repo | [../playbooks/](../playbooks/) |
| Look up a domain term | [GLOSSARY.md](GLOSSARY.md) |
| Understand why a design choice was made | [DECISIONS.md](DECISIONS.md) |
| Avoid a known trap | [GOTCHAS.md](GOTCHAS.md) |
| See open issues / review TODOs | [../TODO/INDEX.md](../TODO/INDEX.md) |

## By domain

| Domain | Entry point | Key files |
|---|---|---|
| **auth** | [auth/README.md](auth/README.md) | oauth-flow, sessions, route-protection, user-identity |
| **mp-provider** | [mp-provider/README.md](mp-provider/README.md) | architecture, client, type-generation, error-handling + 6 services/ |
| **mp-schema** | [mp-schema/README.md](mp-schema/README.md) | tables, stored-procs, required-procs, data-model-map |
| **services** | [services/README.md](services/README.md) | query-patterns + 6 per-service docs |
| **components** | [components/README.md](components/README.md) | tool-framework, layout, ui + 4 feature docs (address-labels, dev-panel, field-management, group-wizard) |
| **contexts** | [contexts/README.md](contexts/README.md) | user-provider, session |
| **routing** | [routing/README.md](routing/README.md) | app-router, proxy |
| **data-flow** | [data-flow/README.md](data-flow/README.md) | call-graphs, error-catalog |
| **testing** | [testing/README.md](testing/README.md) | setup, mocks, cookbook, inventory |
| **dto-constants** | [dto-constants/README.md](dto-constants/README.md) | dtos, constants |
| **utils** | [utils/README.md](utils/README.md) | barcodes, label-stock, tool-params |
| **security** | [security/README.md](security/README.md) | single file: authorization policy, endpoint surface, headers/CSP, findings |

## Cross-cutting

- [GLOSSARY.md](GLOSSARY.md) — 50 domain terms (alphabetized, one-line definitions)
- [DECISIONS.md](DECISIONS.md) — 27 architectural decisions (ADR-001–027; ADR-023 superseded) grouped by domain
- [GOTCHAS.md](GOTCHAS.md) — 47 symptom-first traps (GOTCHA-001–047; 038/039 retired) with fixes
- [ministryplatform.datetimehandling.md](ministryplatform.datetimehandling.md) — MP date/time boundary rules (`DomainTimezoneService`)
- [../../.github/SECURITY.md](../../.github/SECURITY.md) — human-facing security policy (vulnerability reporting); agent detail lives in [security/README.md](security/README.md)

## Open TODOs

- [`../TODO/INDEX.md`](../TODO/INDEX.md) — open TODOs by severity / tag / area (open work only; closed items are deleted)
- [`../TODO/SCHEMA.md`](../TODO/SCHEMA.md) — required format for new TODO files

## Meta

- [`../../CLAUDE.md`](../../CLAUDE.md) — top-level agent guide (points here)
- [`_meta/conventions.md`](_meta/conventions.md) — writing rules for editing these docs
- [`_meta/verification-rules.md`](_meta/verification-rules.md) — how to verify claims
- [`_meta/schemas/`](_meta/schemas/) — templates for every doc type
- [`_meta/facts/`](_meta/facts/) — frozen facts snapshots per review date (baseline: `2026-04-17.md` at SHA `971c40b`; read the newest file for current counts)

## How to maintain

When editing any doc under `.claude/references/**`:
1. Follow the schema in `_meta/schemas/` for that doc type (frontmatter + sections)
2. Verify every factual claim per `_meta/verification-rules.md`
3. For issues outside your edit scope, drop a TODO per `../TODO/SCHEMA.md`
4. Update `last_verified: YYYY-MM-DD` in the doc's frontmatter
5. For framework API claims (Next.js, React, Better Auth, Zod, Vitest), use context7 — do not trust training

For a full review cycle (like the one that produced this), see `docs/superpowers/specs/2026-04-17-context-engineering-doc-review-design.md` and `docs/superpowers/plans/2026-04-17-context-engineering-doc-review.md` (local-only, gitignored).

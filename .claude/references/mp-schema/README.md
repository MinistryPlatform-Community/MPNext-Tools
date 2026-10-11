---
title: Ministry Platform Schema
type: index
domain: mp-schema
---

## What's in this domain
Auto-generated catalogs of Ministry Platform tables and stored procedures, plus a hand-written reference for the procs the app actually calls. All content here is derived from the MP REST API metadata and regenerated via npm scripts.

## File map

| File | Purpose | When to read |
|------|---------|--------------|
| `tables.md` | 307 MP tables with PKs, FKs, access levels (auto-generated) | Looking up a table name, PK, or FK relationship before writing a query |
| `stored-procs.md` | 539 MP stored procedures with parameter signatures (auto-generated) | Verifying a proc name, its parameters, or bounded string sizes |
| `required-procs.md` | The 7 procs the app actively calls via `ToolService` + `FieldManagementService`, plus the installed-but-uncalled procs in `db/` | Working on `ToolService`, `FieldManagementService`, page/selection lookups, or user tool routing |
| `data-model-map.md` | Map from MP schema → which tables, FK traversals, and procs the app actually queries (34 tables, 7 procs) | Understanding data access footprint or impact of schema changes |

## Regeneration commands

| Output | Command | Generator |
|---|---|---|
| `tables.md` | `npm run mp:generate:models` | `src/lib/providers/ministry-platform/scripts/generate-types.ts` (runs with `--clean --zod`, emits `.ts` + `Schema.ts` under `src/lib/providers/ministry-platform/models/`, and writes `tables.md` directly — skipped on a `--search` run) |
| `stored-procs.md` | `npm run mp:generate:storedprocs` | `src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts` (writes `stored-procs.md` directly; `-o` overrides, and a `-s` run requires `-o`) |

Both generators write the whole file, frontmatter included, with `last_verified` set to the generation date — do not hand-edit them; regenerate instead. Last regenerated from the live MP instance on 2026-10-11.

## Code surfaces

| Path | Role |
|------|------|
| `src/lib/providers/ministry-platform/models/` | Generated TS types + Zod schemas for all MP tables |
| `src/lib/providers/ministry-platform/services/procedure.service.ts` | HTTP client for `/procs/{name}` |
| `src/lib/providers/ministry-platform/helper.ts` | `MPHelper` facade (`executeProcedure`, `executeProcedureWithBody`, `getTableRecords`, etc.) |
| `src/services/toolService.ts` | App-level service wrapping 5 of the 7 procs (`fieldManagementService.ts` wraps the other `api_MPNextTools_*` procs) |

## Related domains

- `../mp-provider/README.md` — the MP REST client, auth, metadata, and table/procedure services
- `../services/README.md` — application services built on top of `MPHelper`
- `../dto-constants/README.md` — hand-written DTOs layered over generated table types

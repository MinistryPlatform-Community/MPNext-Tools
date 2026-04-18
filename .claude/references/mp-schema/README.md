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
| `tables.md` | 301 MP tables with PKs, FKs, access levels (auto-generated) | Looking up a table name, PK, or FK relationship before writing a query |
| `stored-procs.md` | 532 MP stored procedures with parameter signatures (auto-generated) | Verifying a proc name, its parameters, or bounded string sizes |
| `required-procs.md` | The 3 procs the app actively calls via `ToolService` + infrastructure docs | Working on `ToolService`, page/selection lookups, or user tool routing |

> `data-model-map.md` will land here in a later review phase (not produced by this agent).

## Regeneration commands

| Output | Command | Generator |
|---|---|---|
| `tables.md` content | `npm run mp:generate:models` | `src/lib/providers/ministry-platform/scripts/generate-types.ts` (runs with `--clean --zod`, emits `.ts` + `Schema.ts` under `src/lib/providers/ministry-platform/models/`) |
| `stored-procs.md` content | `npm run mp:generate:storedprocs` | `src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts` |

The auto-generated markdown in `tables.md` and `stored-procs.md` is a snapshot — rerun the generator when MP schema drifts.

## Code surfaces

| Path | Role |
|------|------|
| `src/lib/providers/ministry-platform/models/` | Generated TS types + Zod schemas for all MP tables |
| `src/lib/providers/ministry-platform/services/procedure.service.ts` | HTTP client for `/procs/{name}` |
| `src/lib/providers/ministry-platform/helper.ts` | `MPHelper` facade (`executeProcedure`, `executeProcedureWithBody`, `getTableRecords`, etc.) |
| `src/services/toolService.ts` | App-level service wrapping the 3 required procs |

## Related domains

- `../mp-provider/README.md` — the MP REST client, auth, metadata, and table/procedure services
- `../services/README.md` — application services built on top of `MPHelper`
- `../dto-constants/README.md` — hand-written DTOs layered over generated table types

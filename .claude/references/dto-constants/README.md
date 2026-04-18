---
title: dto-constants
type: index
domain: dto-constants
---

## What's in this domain
Hand-written application-level DTOs/ViewModels (`src/lib/dto/`), shared runtime constants (`SERVICE_TYPES`, `LABEL_STOCKS`, `WIZARD_STEPS`), and the SQL-safety validation helpers in `src/lib/validation.ts`.

## File map

| File | Purpose | When to read |
|------|---------|--------------|
| `dtos.md` | Catalog of hand-written DTOs (`LabelData`, `LabelConfig`, `SkipRecord`, etc.), fields, consumers | Adding a new DTO or wiring up a label/export feature |
| `constants.md` | Shared `as const`/module-level constants, magic-number audit, validation helpers (`validateGuid`, `escapeFilterString`) | Before hardcoding a new ID, enum, or SQL filter fragment |

## Code surfaces

| Path | Role |
|------|------|
| `src/lib/dto/address-label.dto.ts` | All current DTOs + `SERVICE_TYPES` constant |
| `src/lib/dto/index.ts` | Barrel re-export for `@/lib/dto` |
| `src/lib/validation.ts` | SQL-safety helpers (GUID, positive int, column name, LIKE escape) |
| `src/lib/validation.test.ts` | 19 tests across the 4 helpers |
| `src/lib/label-stock.ts` | `LABEL_STOCKS` constant (Avery sheet geometries) |
| `src/lib/barcode-helpers.ts` | Pre-encodes `LabelData[]` using `LabelConfig` |
| `src/lib/tool-params.ts` | `PageData`, `ToolParams` URL-param view models |
| `src/components/group-wizard/types.ts` | `WIZARD_STEPS` constant + wizard view models |

## Related domains

- `../services/README.md` — services consume DTOs and validation helpers
- `../mp-provider/README.md` — generated Zod schemas are the DB-layer counterpart to these hand-written DTOs
- `../utils/README.md` — barcode / label-stock helpers (separate domain; cross-ref only)
- `../testing/README.md` — `validation.test.ts` patterns

---
title: MP Type Generation CLI
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/scripts/generate-types.ts
  - src/lib/providers/ministry-platform/models/
symbols:
  - generate-types
related:
  - architecture.md
  - ../mp-schema/README.md
last_verified: 2026-04-17
---

## Purpose
`tsx` script that queries Ministry Platform's metadata API via `MPHelper.getTables()` and writes TypeScript interfaces, optional Zod schemas, a barrel `index.ts`, and a summary schema doc. Produces the 603 model files under `src/lib/providers/ministry-platform/models/` consumed by the barrel `export * from './models'` in `index.ts`.

## Files
- `src/lib/providers/ministry-platform/scripts/generate-types.ts` — CLI
- `src/lib/providers/ministry-platform/scripts/README.md` — human-facing usage
- `src/lib/providers/ministry-platform/models/` — output: 603 `.ts` files (verified by snapshot: `.claude/references/_meta/facts/2026-04-17.md`)
- `.claude/references/ministryplatform.schema.md` — schema doc written by the same script

## Key concepts

- **Invoked via npm scripts:**
  - `npm run mp:generate` → `tsx .../generate-types.ts` (default output `./generated-types`)
  - `npm run mp:generate:models` → `tsx .../generate-types.ts -o src/lib/providers/ministry-platform/models --zod --clean` (canonical)
- **Data source:** MP `/tables` metadata endpoint via `MPHelper.getTables(search?)`, which hits `MetadataService`
- **Column-driven typing is the default path;** `--detailed` falls back to record-sampling only if a table has no column metadata
- **Field-name safety:** non-identifier field names are quoted (e.g. `"Allow_Check-in"`, `"SSN/EIN"`) — see `generate-types.ts:163-166`
- **Environment load order:** `.env.local` → `.env.development` → `.env` (each loaded via `dotenv.config`, later files don't override earlier ones because `dotenv` skips already-set keys — so `.env.local` wins) — `generate-types.ts:9-20`

## API / Interface

### Command-line flags

| Flag | Short | Type | Default | Effect |
|------|-------|------|---------|--------|
| `--output <dir>` | `-o` | path | `./generated-types` | Output dir for `.ts` files |
| `--search <term>` | `-s` | string | (none) | Passed to `getTables(search)` to filter |
| `--detailed` | `-d` | flag | `false` | For tables with no column metadata, sample records and infer types |
| `--sample-size <n>` | | number | `5` | # records to sample in `--detailed` |
| `--zod` | `-z` | flag | `false` | Also emit `{Name}Schema.ts` with Zod schema |
| `--clean` | `-c` | flag | `false` | Delete all `.ts` files in output dir before generating |
| `--help` | `-h` | flag | — | Show help, exit |

Source: `generate-types.ts:56-104`.

### Required env vars

Validated at startup (`generate-types.ts:512-528`):
- `MINISTRY_PLATFORM_BASE_URL`
- `MINISTRY_PLATFORM_CLIENT_ID`
- `MINISTRY_PLATFORM_CLIENT_SECRET`

If missing, prints each missing var and `process.exit(1)`.

### Generated artifacts per table

| File | Condition | Shape |
|------|-----------|-------|
| `{PascalCaseTable}.ts` | always (valid name) | `export interface {Name} { ... }` + `export type {Name}Record = {Name}` |
| `{PascalCaseTable}Schema.ts` | `--zod` AND table has columns | `export const {Name}Schema = z.object({ ... })` + `export type {Name}Input = z.infer<...>` |
| `index.ts` | always | `export * from './{Name}';` for every generated file |
| `ministryplatform.schema.md` | always | Written to `.claude/references/ministryplatform.schema.md` — one-line summary per table |

### TypeScript type mapping

From `mapDataTypeToTypeScript` (`generate-types.ts:168-222`):

| MP `ParameterDataType` | TS (required) | Notes |
|---|---|---|
| `String`/`Text`/`LargeString` | `string /* max N chars */` | size comment if present |
| `Email` | `string /* email */` | |
| `Phone` | `string /* phone number */` | |
| `Url` | `string /* URL */` | |
| `Integer16`/`Integer32`/`Integer64` | `number /* ..-bit integer */` | |
| `Decimal`/`Real`/`Money` | `number /* decimal */` or `/* currency amount */` | |
| `Counter` | `number /* auto-increment */` | |
| `Boolean` | `boolean` | |
| `Date` | `string /* ISO date (YYYY-MM-DD) */` | |
| `Time` | `string /* ISO time (HH:MM:SS) */` | |
| `DateTime`/`Timestamp` | `string /* ISO datetime */` | |
| `Guid` | `string /* GUID/UUID */` | |
| `Binary`/`Image` | `Blob \| string` | |
| `Xml` | `string /* XML content */` | |
| `Password`/`SecretKey` | `string` | |
| `Separator` | `never` | filtered out of interfaces |
| default | `unknown` | |

Non-required fields append ` | null` and use `?:` instead of `:`.

Annotations emitted as inline comments (`generate-types.ts:359-365`): `Primary Key`, `Foreign Key -> {ReferencedTable}.{ReferencedColumn}`, `Read Only`, `Computed`, `Has Default`.

### Zod type mapping

From `mapDataTypeToZod` (`generate-types.ts:224-287`):

| MP type | Zod |
|---|---|
| `String`/`Text`/`LargeString` | `z.string()[.max(N)]` |
| `Email` | `z.string().email()[.max(N)]` |
| `Url` | `z.string().url()[.max(N)]` |
| `Phone`/`Time` | `z.string()` (no format) |
| `Integer*`/`Counter` | `z.number().int()` |
| `Decimal`/`Real`/`Money` | `z.number()` |
| `Boolean` | `z.boolean()` |
| `Date` | `z.string().date()` |
| `DateTime`/`Timestamp` | `z.string().datetime()` |
| `Guid` | `z.string().uuid()` |
| default | `z.unknown()` |

Non-required columns chain `.nullable()`.

### Naming

- `sanitizeTypeName` (`generate-types.ts:140-154`) splits on `-_\s/`, title-cases each piece, strips non-alphanumerics, and prepends `_` if the name starts with a digit

## How it works

1. `dotenv.config` on `.env.local`, `.env.development`, `.env` in order
2. Parse argv → `CLIOptions`
3. `validateEnvironment` — exit 1 if required OAuth env missing
4. `new MPHelper()` → `getTables(search?)` — one HTTP round-trip for all table metadata
5. Create or clean output directory (`--clean` deletes all `.ts` files in dir, keeps non-ts files)
6. For each table with a valid `Name`:
   - Build `{PascalCase}.ts` from column metadata (default) or sampled records (`--detailed` on tables without columns)
   - If `--zod` and table has columns, write `{PascalCase}Schema.ts`
7. Write `index.ts` barrel exports
8. Write `.claude/references/ministryplatform.schema.md` via `generateSchemaDocument`
9. Print summary: `Successfully generated N table types [+ M Zod schemas] (X total files)`

## Usage

```bash
# Canonical: regenerate all 603 files, clean first, include Zod schemas
npm run mp:generate:models

# Filtered + custom output
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -o ./types -s "Contact" --zod

# Detailed (sample records for tables with no column metadata)
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -d --sample-size 10

# Help
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --help
```

The canonical npm script:

```json
// package.json
"mp:generate:models": "tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models --zod --clean"
```

## Gotchas

- **Never hand-edit files under `models/`.** The `--clean` flag in `mp:generate:models` deletes every `.ts` file in the output directory before regenerating. Any local edits are lost.
- **`--clean` is scoped to `.ts` extension.** Non-ts files in the output dir survive (see `generate-types.ts:575-579`).
- **`--detailed` only fires when columns are missing.** `generate-types.ts:608-622` — `if (options.detailed && (!table.Columns || table.Columns.length === 0))`. If every table has column metadata, `--detailed` has no effect and doesn't incur sampling costs.
- **Schema doc path is hard-coded.** `generateSchemaDocument` always writes to `./.claude/references/ministryplatform.schema.md` relative to `process.cwd()` (`generate-types.ts:658`). Running the script from a different cwd can write the doc in an unexpected place.
- **`require.main === module` guard is CJS-only.** The script uses `require.main` at `generate-types.ts:712` — works under `tsx` (CJS shim) but would need adjustment if the project moves to pure ESM for scripts.
- **Zod schemas do not infer nullability from MP metadata perfectly.** `mapDataTypeToZod` uses `.nullable()` for non-required fields, so schemas match the TypeScript `| null` emission, but do not match the `?:` optional marker on the interface. Consumers doing `Schema.parse(record)` on a POSTed record must include the key (or use `.optional()` themselves).

## Related docs
- `architecture.md` — where generated models plug into the stack
- `../mp-schema/README.md` — summary schema doc the script emits

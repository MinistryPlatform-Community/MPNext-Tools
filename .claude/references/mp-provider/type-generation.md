---
title: MP Type Generation CLI
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/scripts/generate-types.ts
  - src/lib/providers/ministry-platform/scripts/codegen-escape.ts
  - src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts
  - src/lib/providers/ministry-platform/models/
  - .claude/references/mp-schema/tables.md
  - .claude/references/mp-schema/stored-procs.md
symbols:
  - generate-types
  - commentText
  - propertyKey
  - positiveInt
  - mapDataTypeToZod
  - MP_DATETIME_PATTERN
  - MP_DATE_PATTERN
  - generateIndexFile
  - generateSchemaDocument
related:
  - architecture.md
  - ../mp-schema/README.md
last_verified: 2026-10-11
---

## Purpose
`tsx` script that queries Ministry Platform's metadata API via `MPHelper.getTables()` and writes TypeScript interfaces, optional Zod schemas, a barrel `index.ts`, and the committed table catalog `../mp-schema/tables.md`. Produces the 615 model files (307 interfaces + 307 Zod schemas + `index.ts`, as of the 2026-10-11 regeneration) under `src/lib/providers/ministry-platform/models/` consumed by the barrel `export * from './models'` in `index.ts`.

## Files
- `src/lib/providers/ministry-platform/scripts/generate-types.ts` — CLI
- `src/lib/providers/ministry-platform/scripts/codegen-escape.ts` — escaping helpers for MP metadata interpolated into generated source (+ `codegen-escape.test.ts`)
- `src/lib/providers/ministry-platform/scripts/generate-types.test.ts` — unit tests for the Zod mapping, barrel and catalog generators
- `src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts` — sibling CLI writing `../mp-schema/stored-procs.md` (+ `generate-storedprocs.test.ts`)
- `src/lib/providers/ministry-platform/scripts/README.md` — human-facing usage
- `src/lib/providers/ministry-platform/models/` — output: 615 `.ts` files (307 tables × interface + schema, plus `index.ts`)
- `.claude/references/mp-schema/tables.md` — table catalog written by the same script, frontmatter included (`last_verified` = generation date). Written only on a full run; a `--search` run skips it so a partial table list never overwrites the catalog

## Key concepts

- **Invoked via npm scripts:**
  - `npm run mp:generate` → `tsx --conditions=react-server .../generate-types.ts` (default output `./generated-types`)
  - `npm run mp:generate:models` → `tsx --conditions=react-server .../generate-types.ts -o src/lib/providers/ministry-platform/models --zod --clean` (canonical)
- **`--conditions=react-server` is required** for every direct `tsx` run of `generate-types.ts` / `generate-storedprocs.ts`. They import `MPHelper`, and the MP client modules (`helper.ts`, `client.ts`, `auth/client-credentials.ts`) start with `import 'server-only'`, which throws unless resolved under that export condition. The npm scripts pass it. `build-sql-install.ts` imports nothing from the provider, so it doesn't need the flag. See GOTCHA-046.
- **Data source:** MP `/tables` metadata endpoint via `MPHelper.getTables(search?)`, which hits `MetadataService`
- **Column-driven typing is the default path;** `--detailed` falls back to record-sampling only if a table has no column metadata
- **Field-name safety:** non-identifier field names are emitted as JSON string literals (e.g. `"Allow_Check-in"`, `"SSN/EIN"`) — `formatFieldName` → `propertyKey` (`codegen-escape.ts`), also applied to the `--detailed` fallback `${name}_ID` key
- **All MP metadata is escaped before interpolation** (the output is committed and compiled, so a hostile/odd value must not become code). One helper per context in `codegen-escape.ts`:
  - `propertyKey(name)` — bare if `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`, else `JSON.stringify(name)`
  - `commentText(value)` — line terminators (CR, LF, U+2028, U+2029) → space, `*/` → `*\/`; used for FK target table/column, `SpecialPermissions`, `AccessLevel`, and the table name in the JSDoc header
  - `positiveInt(value)` — positive safe integer (number or digit-only string) else `undefined`; gates every `Size` interpolation (`/* max N chars */`, `Max length: N`, Zod `.max(N)`) — a non-numeric size drops the constraint instead of emitting it
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

Source: `generate-types.ts:50-98`.

### Required env vars

Validated at startup (`generate-types.ts:545-561`):
- `MINISTRY_PLATFORM_BASE_URL`
- `MINISTRY_PLATFORM_CLIENT_ID`
- `MINISTRY_PLATFORM_CLIENT_SECRET`

If missing, prints each missing var and `process.exit(1)`.

### Generated artifacts per table

| File | Condition | Shape |
|------|-----------|-------|
| `{PascalCaseTable}.ts` | always (valid name) | `export interface {Name} { ... }` + `export type {Name}Record = {Name}` |
| `{PascalCaseTable}Schema.ts` | `--zod` AND table has columns | `export const {Name}Schema = z.object({ ... })` + `export type {Name}Input = z.infer<...>` |
| `index.ts` | always | `export * from "./{Name}";` for every **interface** file present in the output dir after the run (`generateIndexFile` scans the directory, sorted), so a `--search` run keeps the other tables in the barrel. `*Schema.ts` companions are **not** re-exported; import them by path (`@/lib/providers/ministry-platform/models/ContactLogSchema`) |
| `../mp-schema/tables.md` | full runs (no `--search`) | Written to `.claude/references/mp-schema/tables.md` with its frontmatter — one-line summary per table (`SCHEMA_DOC_PATH`) |

### TypeScript type mapping

From `mapDataTypeToTypeScript` (`generate-types.ts`):

| MP `ParameterDataType` | TS (required) | Notes |
|---|---|---|
| `String`/`Text`/`LargeString` | `string /* max N chars */` | size comment only if `positiveInt(Size)` |
| `Email` | `string /* email */` | `/* email, max N chars */` when sized |
| `Phone` | `string /* phone number */` | |
| `Url` | `string /* URL */` | `/* URL, max N chars */` when sized |
| `Integer16`/`Integer32`/`Integer64` | `number /* ..-bit integer */` | |
| `Decimal`/`Real`/`Money` | `number /* decimal */` or `/* currency amount */` | |
| `Counter` | `number /* auto-increment */` | |
| `Boolean` | `boolean` | |
| `Date` | `string /* ISO date (YYYY-MM-DD) */` | |
| `Time` | `string /* ISO time (HH:MM:SS) */` | |
| `DateTime`/`Timestamp` | `string /* ISO datetime */` | |
| `Guid` | `string /* GUID/UUID */` | |
| `Binary`/`Image` | `Blob \| string /* binary data */` | |
| `Xml` | `string /* XML content */` | |
| `Password`/`SecretKey` | `string /* password hash */` / `string /* secret key */` | |
| `Separator` | `never` | filtered out of interfaces |
| default | `unknown` | |

Non-required fields append ` | null` and use `?:` instead of `:`.

Annotations emitted as inline comments (`generateDetailedTypeDefinition` in `generate-types.ts`; FK names pass through `commentText`): `Primary Key`, `Foreign Key -> {ReferencedTable}.{ReferencedColumn}`, `Read Only`, `Computed`, `Has Default`.

### Zod type mapping

From `mapDataTypeToZod` (`generate-types.ts`; `N` = `positiveInt(col.Size)`, `.max` omitted when undefined):

| MP type | Zod |
|---|---|
| `String`/`Text`/`LargeString` | `z.string()[.max(N)]` |
| `Email` | `z.string().email()[.max(N)]` |
| `Url` | `z.string().url()[.max(N)]` |
| `Phone`/`Time` | `z.string()` (no format) |
| `Integer*`/`Counter` | `z.number().int()` |
| `Decimal`/`Real`/`Money` | `z.number()` |
| `Boolean` | `z.boolean()` |
| `Date` | `z.string().regex(/MP_DATE_PATTERN/)` — `YYYY-MM-DD`, optionally followed by a time part as below (MP returns Date columns as `YYYY-MM-DDT00:00:00`) |
| `DateTime`/`Timestamp` | `z.string().regex(/MP_DATETIME_PATTERN/)` — `^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z\|[+-]\d{2}:?\d{2})?$` |
| `Guid` | `z.string().uuid()` |
| default | `z.unknown()` |

Non-required columns chain `.nullable()`.

**Why a regex, not `z.string().datetime()`/`.date()`:** MP stores and returns wall-clock values with no zone marker, and `DomainTimezoneService.toMpSqlDatetime()` emits `YYYY-MM-DD HH:MM:SS` (CLAUDE.md rule 17). Zod 4's `.datetime()` requires a `T` and a `Z`/offset, so it rejected exactly those values. The pattern accepts both wall-clock and ISO (space or `T`, optional seconds/fraction, optional `Z`/`±HH:MM`). It is emitted inline in each `*Schema.ts` (no shared import), so generated files stay standalone; the source of truth is the `MP_DATETIME_PATTERN` / `MP_DATE_PATTERN` constants in `generate-types.ts`.

### Naming

- `sanitizeTypeName` (`generate-types.ts:134-148`) splits on `-_\s/`, title-cases each piece, strips non-alphanumerics, and prepends `_` if the name starts with a digit

## How it works

1. `dotenv.config` on `.env.local`, `.env.development`, `.env` in order
2. Parse argv → `CLIOptions`
3. `validateEnvironment` — exit 1 if required OAuth env missing
4. `new MPHelper()` → `getTables(search?)` — one HTTP round-trip for all table metadata
5. Create or clean output directory (`--clean` deletes all `.ts` files in dir, keeps non-ts files)
6. For each table with a valid `Name`:
   - Build `{PascalCase}.ts` from column metadata (default) or sampled records (`--detailed` on tables without columns)
   - If `--zod` and table has columns, write `{PascalCase}Schema.ts`
7. Write `index.ts` barrel from a scan of the output directory (`generateIndexFile`)
8. Unless `--search` was given, write `.claude/references/mp-schema/tables.md` (with frontmatter) via `generateSchemaDocument`
9. Print summary: `Successfully generated N table types [+ M Zod schemas] (X total files)`

## Usage

```bash
# Canonical: regenerate all model files, clean first, include Zod schemas
npm run mp:generate:models

# Filtered + custom output
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts -o ./types -s "Contact" --zod

# Detailed (sample records for tables with no column metadata)
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts -d --sample-size 10

# Help
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --help
```

The canonical npm script:

```json
// package.json
"mp:generate:models": "tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models --zod --clean"
```

## Gotchas

- **Never hand-edit files under `models/`.** The `--clean` flag in `mp:generate:models` deletes every `.ts` file in the output directory before regenerating. Any local edits are lost.
- **`--clean` is scoped to `.ts` extension.** Non-ts files in the output dir survive (see `generate-types.ts:603-614`); and it only runs when the output dir already exists.
- **`--detailed` only fires when columns are missing.** `generate-types.ts:641` — `if (options.detailed && (!table.Columns || table.Columns.length === 0))`. If every table has column metadata, `--detailed` has no effect and doesn't incur sampling costs.
- **Catalog path is relative to cwd.** `SCHEMA_DOC_PATH` (`.claude/references/mp-schema/tables.md`) is resolved against `process.cwd()`, so run the script from the repo root (the npm scripts do).
- **`--search` never rewrites the catalogs.** `generate-types.ts` skips `tables.md` on a `-s` run; `generate-storedprocs.ts` refuses `-s` without an explicit `-o`.
- **`require.main === module` guard is CJS-only.** The script checks `require.main` at `generate-types.ts:751` (guarded with `typeof require`, so Vitest can import the exported generators without running `main()`) — works under `tsx` (CJS shim) but would need adjustment if the project moves to pure ESM for scripts.
- **Zod schemas do not infer nullability from MP metadata perfectly.** `mapDataTypeToZod` uses `.nullable()` for non-required fields, so schemas match the TypeScript `| null` emission, but do not match the `?:` optional marker on the interface. Consumers doing `Schema.parse(record)` on a POSTed record must include the key (or use `.optional()` themselves).

## Related docs
- `architecture.md` — where generated models plug into the stack
- `../mp-schema/README.md` — the catalogs the generators write (`tables.md`, `stored-procs.md`)

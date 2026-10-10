---
title: Generated Zod schemas reject MP wall-clock datetimes
severity: high
tags: [bug]
area: mp-provider
files: [src/lib/providers/ministry-platform/scripts/generate-types.ts, src/lib/providers/ministry-platform/models/]
discovered: 2026-10-10
discovered_by: doc-review
status: open
---

## Problem
`mapDataTypeToZod` maps MP `DateTime`/`Timestamp` columns to `z.string().datetime()`,
which in Zod 4 accepts only ISO strings with a `Z`/offset. Rule 17 requires datetimes to
be sent as MP wall-clock values from `DomainTimezoneService.toMpSqlDatetime()`
(`YYYY-MM-DD HH:MM:SS`), which that validator rejects. Passing a generated `schema` to
`createTableRecords()`/`updateTableRecords()` for any record carrying a datetime therefore
throws `MPValidationError` before the API call — the two documented best practices
(validate with `schema`, convert with `DomainTimezoneService`) cannot both be followed.

## Evidence
- `src/lib/providers/ministry-platform/scripts/generate-types.ts:276-278` — `DateTime` → `z.string().datetime()`
- `models/ContactLogSchema.ts:6` — `Contact_Date: z.string().datetime()`
- `node -e "z.string().datetime().safeParse('2026-05-17 14:30:00').success"` → `false` (zod 4.6.5)

## Proposed fix
Generate a validator that accepts MP wall-clock strings, e.g. a regex for
`^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$`, then run `npm run mp:generate:models`
and add a generator test. Remove the caveats added to `CLAUDE.md` § Validation Best
Practices, `README.md` and `ministryplatform.datetimehandling.md` once fixed.

## Impact if not fixed
Any new code that follows CLAUDE.md's validation guidance on a table with a datetime column
fails at runtime, or "fixes" it by sending UTC ISO strings and silently shifting stored times.

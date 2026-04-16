# Fix Log: 006 - Zod .datetime() for Date-Only Fields

**Status:** FIXED (generator updated; regeneration needed)  
**Commit:** 991a6ba  

## Changes Made
- Changed `mapDataTypeToZod()` in generate-types.ts: `Date` case now emits `z.string().date()` instead of `z.string().datetime()`
- Zod v4's `.date()` validates `YYYY-MM-DD` format (confirmed at runtime)
- Existing 301 schema files will be updated on next `npm run mp:generate:models` run

248/248 tests passing.

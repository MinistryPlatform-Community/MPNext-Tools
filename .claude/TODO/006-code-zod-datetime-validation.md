# Generated Zod Schemas Use .datetime() for Date-Only Fields

**Severity:** HIGH  
**Category:** Code Quality / Data Validation  

## Problem

The type generation script (`src/lib/providers/ministry-platform/scripts/generate-types.ts`) maps both `Date` and `DateTime` MP data types to `z.string().datetime()` in Zod schemas. However, `.datetime()` expects full ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`), while `Date`-typed fields contain date-only strings (`YYYY-MM-DD`).

This means runtime validation will **reject valid date-only inputs** for fields like:
- `Contacts.Date_of_Birth`
- `Contacts.Anniversary_Date`
- `Groups.Start_Date`, `Groups.End_Date`, `Groups.Promotion_Date`
- `Households.Season_Start`, `Households.Season_End`
- Many other date fields across 301 tables

## Affected Code

`src/lib/providers/ministry-platform/scripts/generate-types.ts` — the `mapDataTypeToZod()` function:
```typescript
case "Date":
  zodType = "z.string().datetime()"; // BUG: should be z.string() for date-only
```

## Impact

Any code that uses Zod schema validation (via the `schema` parameter in `createTableRecords()` or `updateTableRecords()`) with date-only fields will fail validation. Currently this is mitigated because schema validation is opt-in, but it means the validation feature is unreliable.

## Recommended Fix

Change the Date case in `mapDataTypeToZod()` to `z.string()` (or add a `.date()` validator if available in Zod v4), then regenerate all models with `npm run mp:generate:models`.

---
title: Unvalidated client-supplied numeric fields interpolated into MP $filter strings in FamilyService
severity: high
tags: [security, bug]
area: services
files: [src/services/familyService.ts, src/app/(web)/tools/addeditfamily/actions.ts, src/lib/dto/family.ts]
discovered: 2026-09-13
discovered_by: coverage-agent-services
status: resolved
---

## Problem
`saveFamily` (the `"use server"` action in `addeditfamily/actions.ts`) accepts a
`Household` object straight from the client and passes it directly to
`FamilyService.saveHousehold()` — it is never parsed through the
`HouseholdSchema`/`FamilyMemberSchema` Zod schemas that already exist in
`src/lib/dto/family.ts` for exactly this purpose. TypeScript's compile-time
`number` type on `FamilyMember.envelopeNo` and `FamilyMember.donorId` is not
enforced at runtime — a server action is a public POST endpoint, and any JSON
body can be sent to it, including e.g. `envelopeNo: "1 OR 1=1"`.

Inside `FamilyService.saveHousehold` → `upsertDonor` → `resolveUniqueEnvelopeNo`,
those two client-controlled values are interpolated directly into an MP
`$filter` string with no `validatePositiveInt` (or any other) check:

```ts
private async resolveUniqueEnvelopeNo(
  requested: number,
  excludeDonorId: number | null,
): Promise<{ envelopeNo: number; bumped: boolean }> {
  let candidate = requested;
  ...
  const filter =
    excludeDonorId && excludeDonorId > 0
      ? `Envelope_No = ${candidate} AND Donor_ID <> ${excludeDonorId}`
      : `Envelope_No = ${candidate}`;
```

Every other filter built in this file first validates its numeric inputs
(`validatePositiveInt(contactId)` in `getHousehold`, `validatePositiveInt(recordId)`
in `resolveContactIdFromPage`), so this is an inconsistency, not the intended
design. This is the same shape of hole CLAUDE.md rule 11 calls out for strings
("escape user input in filters") — here the payload is untyped/unvalidated
numeric input instead of a string, but it reaches a raw `$filter` string the
same way.

## Evidence
- `src/services/familyService.ts:687-712` (`resolveUniqueEnvelopeNo`) — `candidate`
  (from `member.envelopeNo`) and `excludeDonorId` (from `member.donorId`) are
  interpolated into the filter with no type/range check.
- `src/app/(web)/tools/addeditfamily/actions.ts:137-154` (`saveFamily`) — takes
  `household: Household` straight from the client with no `HouseholdSchema.parse()`
  or `.safeParse()` call before it reaches the service.
- Contrast with `src/services/familyService.ts:150,175` where the same file
  validates `recordId`/`contactId` via `validatePositiveInt` before use in a
  filter.
- Confirmed via test: `src/services/familyService.test.ts` exercises
  `resolveUniqueEnvelopeNo` only with well-formed numbers (current behavior is
  documented, not exploited, per this task's instructions not to modify source).

## Proposed fix
1. In `saveFamily` (`actions.ts`), parse the incoming `household` argument with
   `HouseholdSchema.safeParse()` before calling `FamilyService.saveHousehold()`,
   returning an `ActionError` on failure — mirroring the "Validate at API
   boundaries" guidance in CLAUDE.md.
2. Defense in depth: in `resolveUniqueEnvelopeNo` and `upsertDonor`, call
   `validatePositiveInt` (or an equivalent nullable-safe check) on `requested`/
   `envelopeNo` and `excludeDonorId`/`existingDonorId` before they are
   interpolated into any `$filter` string.

## Impact if not fixed
An authenticated user with write access to `Households` (the only gate this
action checks) can submit a crafted `envelopeNo` or `donorId` value that is
not a plain positive integer. Depending on how the MP OData-style `$filter`
parser handles the resulting string, this ranges from a confusing 400/500
error to a filter-injection primitive against the `Donors` table — the same
class of risk rule 11 exists to close off for string fields.

---

## Resolution (2026-09-13)
Both layers of the proposed fix were applied.

**1. Parse at the action boundary.** `saveFamily` now runs
`HouseholdSchema.safeParse(household)` before the payload reaches
`FamilyService`, and returns an `ActionError` on failure. The error reports the
offending field PATHS only (`members.0.envelopeNo`), never the submitted
values — rule 14 applies to returned error strings, which travel further than
logs. Authorization still runs first, so an unauthorized caller learns nothing
about the schema.

**2. Validate where the filter is built.** `resolveUniqueEnvelopeNo` calls
`validatePositiveInt` on `requested` and on `excludeDonorId`, and re-validates
`candidate` on every loop iteration so a future change to
`getNextEnvelopeNumber()` cannot reintroduce an unchecked value. `upsertDonor`
validates `existingDonorId` before using it to target the `Donors` update.
`null` and `0` are preserved as the "no donor to exclude" sentinels rather than
being rejected.

### Correction to the original severity assessment
Re-reading this while fixing it: the classic injection string was already
blocked, but incidentally rather than by design. `upsertDonor` guards with
`envelopeNo > 0`, and JS coerces `"1 OR 1=1"` to `NaN`, making that comparison
false — so the crafted string never reached the filter. What *did* get through
were values that survive numeric coercion but are not positive integers:
`1.5`, `Infinity`, `1e21` (which interpolates as the malformed `1e+21`), and
numeric strings. Those produce malformed filters and confusing 400/500s, not a
filter-injection primitive.

So the practical severity was lower than "high" as originally filed. The fix is
still correct and worth keeping: relying on an incidental coercion side effect
to block injection is fragile, and a schema change or a new call path that
drops the `> 0` guard would turn it into the real thing with nothing to catch
it. Recorded here so the next reader is not misled by the original framing.

### Tests
- `src/app/(web)/tools/addeditfamily/actions.test.ts` — 11 cases: injection-shaped
  `envelopeNo`/`donorId`, non-integer/array/object/boolean fields, missing
  top-level fields, path reporting, no value echoed back, authorize-before-validate.
- `src/services/familyService.test.ts` — 7 cases asserting no malformed value
  ever reaches an MP query, that `donorId: 0` is still accepted as "none", and
  that well-formed input produces the exact expected filter string.

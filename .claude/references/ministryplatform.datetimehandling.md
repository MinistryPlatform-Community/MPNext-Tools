# MP Date/Time Handling Reference

This document covers how date and datetime values must flow between the UI, our services, and the Ministry Platform (MP) API. Use it whenever you add a new MP date field, audit a server action that writes dates, or debug a "the saved date is wrong" report.

## Why MP is not UTC

MP stores datetimes as **wall-clock values in the domain's configured time zone** (e.g. `2026-05-17 23:33:00` is literally "11:33 PM in this church's time zone"). It does **not** normalize to UTC on the way in or out. The domain's time zone is exposed via `MPHelper.getDomainInfo().TimeZoneName`.

If you send a value tagged as UTC, MP stores it as if those UTC clock numbers were the local clock numbers — the saved record drifts by the MP-to-UTC offset. The same anti-pattern in reverse on the read path causes drift on display and compounds across edits.

A real symptom of this bug pattern: a Contact Log entry created at 11:33 PM Eastern on 2026-05-17 saves as 2026-05-16 at 8:00 PM. The form appended `T00:00:00.000Z` to a date string, and the service ran `new Date(...).getFullYear()` on the result. Each save shifted the date by the offset between the Node server's local time and UTC. Editing read the already-shifted date and applied the same transform again, so the date moved backwards another day every edit.

## The service

`src/services/domainTimezoneService.ts` — singleton, server-side, cached per process. Always go through this; never reach into `MPHelper.getDomainInfo()` directly to read `TimeZoneName`.

```ts
import { DomainTimezoneService } from '@/services/domainTimezoneService';

const tz = DomainTimezoneService.getInstance();
await tz.getMpTimezone();                  // → "America/New_York" (IANA)
await tz.toMpSqlDatetime('2026-05-17');    // → "2026-05-17 00:00:00"
await tz.toMpSqlDatetime(new Date());      // → MP-TZ wall-clock for "now"
await tz.parseMpDatetime('2026-05-17 12:00:00'); // → Date instant
```

For client-side rendering, expose the IANA zone through the `getMpTimezone()` server action in `src/components/shared-actions/domain.ts` (session-checked, not role-gated — a documented rule-12 carve-out) and thread it as a prop into the component that needs to format MP datetimes.

### `toMpSqlDatetime(value)` — write path

Returns the SQL datetime string MP's table API expects (`YYYY-MM-DD HH:MM:SS`).

| Input | Treated as | Output |
| --- | --- | --- |
| `"2026-05-17"` | MP-TZ wall-clock midnight | `"2026-05-17 00:00:00"` |
| `"2026-05-17 14:30:00"` | MP-TZ wall-clock (already SQL) | `"2026-05-17 14:30:00"` |
| `"2026-05-17T14:30"` | MP-TZ wall-clock | `"2026-05-17 14:30:00"` |
| `"2026-05-17T03:33:00.000Z"` | UTC instant | converted to MP-TZ |
| `"2026-05-17T03:33:00-04:00"` | Instant at offset | converted to MP-TZ |
| `Date` instance | UTC instant | converted to MP-TZ |

The rule: **strings with no zone marker are wall-clock**, strings/Dates with explicit zone info are instants that get converted.

**Zod conflict:** generated `*Schema.ts` files type `DateTime` columns as `z.string().datetime()`, which rejects this `YYYY-MM-DD HH:MM:SS` output (verified on Zod 4.6.5). Do not pass a generated `schema` to `createTableRecords`/`updateTableRecords` for records whose datetime fields came from `toMpSqlDatetime` — it throws `MPValidationError` before the API call.

### `parseMpDatetime(value)` — read path arithmetic

Use when you need a `Date` instant to do real arithmetic on a value MP returned. For pure display, prefer `Intl.DateTimeFormat({ timeZone })` against the raw string.

## Recipes

### Writing a date-only field (`<input type="date">`)

```tsx
// Client component — send the raw string, no Z, no time.
const payload = { Contact_Date: form.contactDate /* "2026-05-17" */ };

// Server action / service
const tz = DomainTimezoneService.getInstance();
const mpDate = await tz.toMpSqlDatetime(payload.Contact_Date);
// → "2026-05-17 00:00:00"
```

### Writing a datetime field with a "save at current moment" intent

```ts
const tz = DomainTimezoneService.getInstance();
const mpDate = await tz.toMpSqlDatetime(new Date());
// → MP-TZ wall-clock representation of the server's "now"
```

### Pre-filling an edit form from a stored MP value

MP returns datetimes as wall-clock strings in MP-TZ (no zone marker). For a date input, take the date portion directly — **do not** parse with `new Date()`:

```tsx
setValue('contactDate', log.Contact_Date.split('T')[0]);
```

For a `datetime-local` input, trim to `YYYY-MM-DDTHH:MM`:

```tsx
function toDatetimeLocalValue(mpDate: string): string {
  const normalized = mpDate.replace(' ', 'T');
  return normalized.length >= 16 ? normalized.slice(0, 16) : `${normalized.slice(0, 10)}T00:00`;
}
```

### Displaying a stored MP datetime in the browser

`new Date(stringFromMp).toLocaleDateString(...)` parses the string as **browser-local**, which silently disagrees with MP-TZ. Format with an explicit `timeZone`:

```tsx
return new Intl.DateTimeFormat('en-US', {
  timeZone: mpTimezone,
  month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
}).format(instant);
```

### Filtering on a date column in `$filter`

`$filter` strings are interpreted in MP-TZ. Quote the value and use MP-TZ wall-clock:

```ts
filter: `Contact_Date >= '2026-05-01' AND Contact_Date < '2026-06-01'`
```

Do not convert filter values to UTC. If you have a `Date` instant in JS, run it through `tz.toMpSqlDatetime(instant)` first.

## Anti-patterns

| Don't | Do |
| --- | --- |
| ``Contact_Date: `${date}T00:00:00.000Z` `` | `Contact_Date: date` |
| `new Date(formValue).toISOString()` | `await tz.toMpSqlDatetime(formValue)` |
| `new Date(mpValue).getFullYear()` etc. | `await tz.parseMpDatetime(mpValue)` or `Intl.DateTimeFormat({ timeZone })` |
| `new Date(mpValue).toLocaleString(...)` for display | `Intl.DateTimeFormat('en-US', { timeZone: mpTimezone, ... })` |
| Reading domain TZ ad-hoc per request | `DomainTimezoneService.getInstance().getMpTimezone()` (cached) |

The shared signature of these bugs: a `Date` object that crosses a zone boundary silently. Whenever you see `new Date(...)` near an MP read/write, ask "what zone is this assumed to be in, and what zone is the caller expecting back?"

## Windows ↔ IANA zone names

MP's `/domain` endpoint returns `TimeZoneName` as a **Windows** zone (e.g. `"Eastern Standard Time"`). `Intl.DateTimeFormat` requires **IANA** (e.g. `"America/New_York"`). `DomainTimezoneService` maps between them (`WINDOWS_TO_IANA`). `resolveIanaTimezone` also passes through values that already look like IANA names (contain `/`) and maps `UTC`/`Etc/UTC` to `Etc/UTC`. If a new MP deployment surfaces an unmapped Windows zone, it throws with the unmapped name — extend the table rather than silently falling back to the server's local zone.

## Testing

When a test exercises code that goes through `DomainTimezoneService`:

1. **Mock `MPHelper.getDomainInfo`** to return a known `TimeZoneName` — declare the mock with `vi.hoisted()` so the `vi.mock('@/lib/providers/ministry-platform', ...)` factory can reference it (the service constructs its `MPHelper` when the singleton is first created).
2. **Reset the singleton** between tests: `(DomainTimezoneService as any).instance = null` in `beforeEach` (or call `clearCache()` to drop only the cached zone).
3. **Use `mockReset()` (not `clearAllMocks()`)** on the `getDomainInfo` mock when you queue per-test responses with `mockResolvedValueOnce`. `clearAllMocks` doesn't drain those queues, and tests that don't hit `getMpTimezone()` leave queue entries behind that leak forward.
4. **Run under multiple `TZ` env vars** — at minimum `TZ=UTC` and `TZ=America/Los_Angeles`. The original bug was invisible when developer machines and the server happened to be in the same zone as the MP domain.

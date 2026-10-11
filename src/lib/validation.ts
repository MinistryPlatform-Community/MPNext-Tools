/**
 * Input validators for values interpolated into Ministry Platform `$filter` /
 * `$select` strings.
 *
 * ERROR MESSAGES NAME THE FIELD, NEVER THE VALUE (CLAUDE.md rule 14). The
 * value is caller-controlled; a thrown message travels further than a log
 * line does (action error results, error boundaries, log aggregators), and a
 * value with a newline in it can forge a structured log line wherever the
 * message is logged.
 *
 * Every validator also checks the runtime type: TypeScript's `string` /
 * `number` annotations are erased, and server-action payloads are
 * caller-shaped, so an array or object must be refused, not coerced.
 */

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMN_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAILER_ID_REGEX = /^(\d{6}|\d{9})$/;

export function validateGuid(value: string): string {
  if (typeof value !== 'string' || !GUID_REGEX.test(value)) {
    throw new Error('Invalid GUID format');
  }
  return value;
}

/**
 * A positive SAFE integer — the safe-integer bound keeps a huge value from
 * stringifying into exponent notation (`1e+21`) inside a filter.
 *
 * @param field - optional name for the error message (never the value)
 */
export function validatePositiveInt(value: number, field?: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(field ? `Expected positive integer for ${field}` : 'Expected positive integer');
  }
  return value;
}

export function validateColumnName(value: string): string {
  if (typeof value !== 'string' || !COLUMN_NAME_REGEX.test(value)) {
    throw new Error('Invalid column name');
  }
  return value;
}

/** A foreign-key traversal segment: an identifier ending in `_TABLE` (any case). */
const FK_SEGMENT_REGEX = /^[A-Za-z][A-Za-z0-9_]*_TABLE$/i;
const MAX_FK_PATH_LENGTH = 256;
const MAX_FK_SEGMENTS = 4;

/**
 * Validate a column reference that may traverse foreign keys, for use in a
 * `$select` — e.g. `Contact_ID`, `Participant_ID_TABLE.Contact_ID`,
 * `Participant_ID_Table.Contact_ID` (the casing `api_Tools_GetPageData`
 * returns), or the underscore-chained `A_ID_TABLE_B_ID_TABLE.Column`.
 *
 * Every segment before the final column must be an identifier ending in
 * `_TABLE`; the final column must be a plain identifier. Nothing else — no
 * spaces, commas, parentheses, quotes, `AS`, or functions — so the value can
 * never add a second column, an alias, or an expression to the `$select`.
 * The error names the field, never the value (CLAUDE.md rule 14).
 */
export function validateFkPath(value: unknown, field = 'column path'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_FK_PATH_LENGTH) {
    throw new Error(`Invalid ${field}`);
  }
  const segments = value.split('.');
  const column = segments.pop() as string;
  if (
    segments.length > MAX_FK_SEGMENTS ||
    !COLUMN_NAME_REGEX.test(column) ||
    !segments.every((s) => FK_SEGMENT_REGEX.test(s))
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

/**
 * Validate a USPS Mailer ID — must be exactly 6 or 9 digits (no other length
 * is valid per USPS IMb spec). Throws on any other input so we never silently
 * emit a malformed barcode.
 */
export function validateMailerId(value: string): string {
  if (!MAILER_ID_REGEX.test(value)) {
    throw new Error(`Mailer ID must be exactly 6 or 9 digits, got: ${value.length}`);
  }
  return value;
}

/** Longest search term accepted by {@link escapeFilterString}. */
export const MAX_SEARCH_TERM_LENGTH = 100;

/**
 * ASCII control characters (C0 range and DEL). None belongs in a search
 * term; a NUL or newline inside a filter string is at best an accident and at
 * worst an attempt to confuse something downstream of it.
 */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Non-ASCII look-alikes of the single quote (left/right single quotation
 * marks, single high-reversed-9 quote, modifier-letter apostrophe, fullwidth
 * apostrophe). Doubling `'` escapes only U+0027; if anything between here and
 * SQL Server ever narrowed one of these to `'` (an implicit NVARCHAR→VARCHAR
 * conversion, say) it would arrive unescaped. Each becomes the LIKE
 * single-character wildcard `_`, which can never be narrowed into a quote and
 * keeps a smart-quote search working (`O’Brien` matches `O'Brien`).
 */
const QUOTE_LOOKALIKES = /[‘’‛ʼ＇]/g;

/**
 * Escape a search term for a T-SQL `LIKE` pattern inside a single-quoted
 * filter value, e.g. `Display_Name LIKE '${escapeFilterString(term)}%'`, so
 * the term matches literally.
 *
 * Uses bracket escaping (no `ESCAPE` clause needed): `[` → `[[]` FIRST (it
 * opens a character class such as `[0-9]`, and escaping it after `%`/`_`
 * would re-escape their brackets), then `%` → `[%]`, `_` → `[_]`, then `'` is
 * doubled, then quote look-alikes become `_`.
 *
 * Throws on a non-string, on a term longer than
 * {@link MAX_SEARCH_TERM_LENGTH}, and on any ASCII control character. Errors
 * describe the problem, never the value.
 */
export function escapeFilterString(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid search value: expected a string');
  }
  if (value.length > MAX_SEARCH_TERM_LENGTH) {
    throw new Error(`Invalid search value: longer than ${MAX_SEARCH_TERM_LENGTH} characters`);
  }
  if (CONTROL_CHARS.test(value)) {
    throw new Error('Invalid search value: control characters are not allowed');
  }
  return value
    .replace(/\[/g, '[[]')
    .replace(/%/g, '[%]')
    .replace(/_/g, '[_]')
    .replace(/'/g, "''")
    // After the `_` escape above, so this wildcard is the only unescaped one.
    .replace(QUOTE_LOOKALIKES, '_');
}

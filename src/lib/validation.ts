const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMN_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAILER_ID_REGEX = /^(\d{6}|\d{9})$/;

export function validateGuid(value: string): string {
  if (!GUID_REGEX.test(value)) {
    throw new Error(`Invalid GUID format: ${value}`);
  }
  return value;
}

export function validatePositiveInt(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Expected positive integer, got: ${value}`);
  }
  return value;
}

export function validateColumnName(value: string): string {
  if (!COLUMN_NAME_REGEX.test(value)) {
    throw new Error(`Invalid column name: ${value}`);
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

export function escapeFilterString(value: string): string {
  return value
    .replace(/'/g, "''")
    .replace(/%/g, '[%]')
    .replace(/_/g, '[_]');
}

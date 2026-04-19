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

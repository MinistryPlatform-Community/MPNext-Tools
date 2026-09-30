/**
 * Input guards shared by the provider services.
 *
 * These services are thin passthroughs to an admin-level service account, so
 * the values they interpolate into request paths are checked here, on their
 * own, whatever the caller (or the central HttpClient path guard) already did.
 * TypeScript types are erased at runtime; a `string` table name can hold
 * `../procs/...` and a `number` record ID can hold `"1/../../x"`.
 *
 * Every guard throws a fixed message naming the FIELD, never the value
 * (CLAUDE.md rule 14), and runs before any token or network work.
 */
import { validateGuid, validatePositiveInt } from "@/lib/validation";

export { errorName } from "../utils/logger";

/**
 * A SQL-style identifier: letter or underscore, then letters, digits or
 * underscores. Covers every MP table and stored procedure name (`Contacts`,
 * `dp_Users`, `api_MPNextTools_GetPages`) and admits nothing that could change
 * the shape of a URL path (`.`, `/`, `\`, `?`, `#`, `%`, whitespace).
 */
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** SQL Server's `sysname` limit. */
const MAX_IDENTIFIER_LENGTH = 128;

/**
 * Validates a table or procedure name for use as a URL path segment.
 *
 * @param value - The candidate name, from any source
 * @param field - Used in the error message (never the offending value)
 * @returns The validated name
 * @throws Error if the value is not a plain identifier
 */
export function sanitizeIdentifier(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    !IDENTIFIER_PATTERN.test(value)
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

/**
 * Validates a record / file ID (positive safe integer) for use as a path
 * segment or `id=` query value. Delegates to {@link validatePositiveInt}.
 */
export function sanitizeRecordId(value: unknown, field: string): number {
  return validatePositiveInt(value as number, field);
}

/** Validates a file unique ID (GUID). Delegates to {@link validateGuid}. */
export function sanitizeUniqueId(value: unknown): string {
  return validateGuid(value as string);
}

/** `/tables/{table}` for a validated table name. */
export function tableEndpoint(table: unknown): string {
  return `/tables/${encodeURIComponent(sanitizeIdentifier(table, 'table name'))}`;
}

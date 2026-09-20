/**
 * Placeholder (merge field) helpers using MP's bracket convention, e.g. `[First_Name]`.
 * Used client-side for the preview and server-side to build each recipient's body.
 */

import type { MergeFieldOption } from '@/lib/dto';

/** `[Token]` where Token is a column-style identifier. */
const PLACEHOLDER_PATTERN = /\[([A-Za-z0-9_]+)\]/g;

/**
 * Contact columns every recipient has, offered in every mode. Page-specific tags from
 * MP's `api_Tools_GetMergeTags` are appended for selections.
 */
export const STANDARD_MERGE_FIELDS: MergeFieldOption[] = [
  { token: 'Nickname', label: 'Nickname', sample: 'Sam' },
  { token: 'First_Name', label: 'First Name', sample: 'Samuel' },
  { token: 'Last_Name', label: 'Last Name', sample: 'Rivera' },
  { token: 'Display_Name', label: 'Display Name', sample: 'Rivera, Samuel' },
  { token: 'Mobile_Phone', label: 'Mobile Phone', sample: '(602) 555-0142' },
  { token: 'Email_Address', label: 'Email Address', sample: 'sam@example.com' },
  { token: 'Congregation_Name', label: 'Campus', sample: 'Phoenix' },
];

/** Columns pulled from Contacts for the standard merge fields. */
export const STANDARD_MERGE_CONTACT_SELECT = [
  'Contacts.Contact_ID',
  'Contacts.Display_Name',
  'Contacts.First_Name',
  'Contacts.Last_Name',
  'Contacts.Nickname',
  'Contacts.Mobile_Phone',
  'Contacts.Email_Address',
  'Contacts.Do_Not_Text',
  'Household_ID_TABLE.Congregation_ID',
  'Household_ID_TABLE_Congregation_ID_TABLE.Congregation_Name',
].join(', ');

/** Distinct placeholder tokens in `body`, in first-occurrence order (without brackets). */
export function extractPlaceholders(body: string): string[] {
  const tokens = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    tokens.add(match[1]);
  }
  return [...tokens];
}

/**
 * Replaces every `[Token]` with `values[Token]`. Unknown or null values become an
 * empty string, matching how MP merges a blank field. Tokens are matched
 * case-insensitively so `[first_name]` still resolves.
 */
export function mergePlaceholders(
  body: string,
  values: Record<string, string | number | null | undefined>
): string {
  if (!body.includes('[')) return body;
  const lookup = new Map<string, string>();
  for (const [key, value] of Object.entries(values)) {
    lookup.set(key.toLowerCase(), value === null || value === undefined ? '' : String(value));
  }
  return body.replace(PLACEHOLDER_PATTERN, (_match, token: string) => {
    return lookup.get(token.toLowerCase()) ?? '';
  });
}

/** Tokens in `body` that none of `known` provides (case-insensitive). */
export function findUnknownPlaceholders(body: string, known: Iterable<string>): string[] {
  const knownLower = new Set([...known].map((k) => k.toLowerCase()));
  return extractPlaceholders(body).filter((t) => !knownLower.has(t.toLowerCase()));
}

/** Sample values keyed by token, for previews before recipients resolve. */
export function sampleMergeValues(fields: MergeFieldOption[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.token, f.sample]));
}

/**
 * Digits-only key used to spot two contacts sharing one phone. A leading US country
 * code is dropped so `+1 (602) 555-0142` and `602-555-0142` collide.
 */
export function normalizePhoneForDedupe(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length >= 7 ? digits : null;
}

/** Human-friendly label for a token: `First_Name` to `First Name`. */
export function labelForToken(token: string): string {
  return token.replace(/_/g, ' ');
}

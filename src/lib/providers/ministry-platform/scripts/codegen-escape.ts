/**
 * Escaping for MP metadata interpolated into generated TypeScript source
 * (`generate-types.ts`).
 *
 * Table names, column names, FK targets, permission strings and sizes all come
 * from the MP API at generation time, and the output is committed and compiled
 * into the app. A value carrying a newline, a `*\/`, a quote or a non-numeric
 * "size" could otherwise close a comment or string early and turn metadata
 * into code. Each helper below matches one interpolation context.
 */

const IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * For text inside a `//` line comment or a `/* *\/` block comment: no line
 * terminators (they end a `//` comment) and no `*\/` (it ends a block comment).
 */
export function commentText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replace(/\*\//g, '*\\/');
}

/** An object-literal / interface property key: bare if a valid identifier, else a JSON string literal. */
export function propertyKey(name: string): string {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name);
}

/**
 * A size interpolated as a number literal (`.max(${n})`, `max ${n} chars`).
 * Returns `undefined` for anything that is not a positive safe integer, so a
 * caller can simply omit the constraint.
 */
export function positiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

/**
 * MP provider logging.
 *
 * There is deliberately NO `debug` channel. It previously wrapped
 * `console.log` and was used to dump `$filter` query params, stored-procedure
 * parameters, PUT request bodies and full result sets — names, email
 * addresses, phone numbers. Being gated on `NODE_ENV !== 'production'` was not
 * enough: developer machines and any non-production deployment still wrote
 * member PII to a terminal or a log aggregator, which typically has broader
 * access and longer retention than the Ministry Platform database itself.
 *
 * The rule for what remains: log IDENTIFIERS AND SHAPE, never content — table
 * names, record IDs, HTTP status. Never record fields, `$filter` strings,
 * request bodies or response bodies.
 *
 * `no-console` in `eslint.config.mjs` enforces this across `src/`, allowing
 * only `warn` and `error`.
 */
export const logger = {
  error: (...args: unknown[]) => console.error('[MP]', ...args),
};

/**
 * What the provider logs for a caught error: its class name only
 * (`Error`, `TypeError`, `TimeoutError`, `SyntaxError`), never the message.
 *
 * Messages can carry response-body fragments (V8's JSON `SyntaxError` quotes
 * the body it failed to parse), request URLs with a `$filter` in them, or
 * member data. The name is enough to triage; the error itself is still
 * re-thrown to the caller.
 *
 * Duck-typed rather than `instanceof Error` because a `DOMException` (what
 * `AbortSignal.timeout` rejects with) is not an `Error` in every realm. Only a
 * plain class-name-shaped `name` is returned; anything else falls back to
 * `typeof`, so a hostile `name` cannot smuggle content into a log line.
 */
export function errorName(error: unknown): string {
  const name =
    typeof error === 'object' && error !== null
      ? (error as { name?: unknown }).name
      : undefined;
  return typeof name === 'string' && /^[A-Za-z]{1,64}$/.test(name) ? name : typeof error;
}

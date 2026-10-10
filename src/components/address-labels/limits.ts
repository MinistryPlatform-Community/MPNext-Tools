/**
 * Size limits for the address-label server actions, shared by the client
 * (early, friendly errors) and the server (the actual enforcement).
 *
 * They are sized against the request-body ceilings, not picked freely:
 * Vercel rejects function request bodies over 4.5 MB, and
 * `experimental.serverActions.bodySizeLimit` in `next.config.ts` is set to
 * 4 MB so Next fails first with a clear error. A 2 MB template is ~2.7 MB as
 * base64, which leaves ~1.3 MB for the label list on a mail merge.
 * Raising any of these means re-checking all three together.
 */
export const MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
export const MAX_TEMPLATE_LABEL = '2MB';

/** Upper bound on labels per request. Bounds PDF/DOCX render memory. */
export const MAX_LABELS = 10_000;

/** Bounds PizZip's decompression of an uploaded template — see `src/lib/zip-guard.ts`. */
export const TEMPLATE_ZIP_LIMITS = {
  maxEntries: 1_000,
  maxTotalBytes: 64 * 1024 * 1024,
} as const;

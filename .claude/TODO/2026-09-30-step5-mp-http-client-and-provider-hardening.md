---
title: "Step 5 — MP HTTP client and provider-service hardening"
severity: medium
tags: [security, missing-test]
area: mp-provider
files: [src/lib/providers/ministry-platform/utils/http-client.ts, src/lib/providers/ministry-platform/client.ts, src/lib/providers/ministry-platform/services/table.service.ts, src/lib/providers/ministry-platform/types/provider.types.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P8/P9)
status: resolved
---

## Problem
- `http-client.ts`: no timeout, no `redirect:"error"`, no path guard in `buildUrl` (`:164`), query keys not encoded,
  `response.json()` unguarded. Token response not validated (`client.ts:63`). Single-flight refresh exists but no
  negative cache and no retry on 401.
- Provider services: paths `encodeURIComponent`'d but not validated (`..` survives); `recordId` unvalidated
  (`table.service.ts:84,113`); no `guards.ts`; `$ignorePermissions` still in `provider.types.ts:101`; ~25
  `logger.error(msg, error)` calls log raw error objects (rule 14).

## Proposed fix
Follow `port-security-review-2026-09-28.md` Phases 8–9 (upstream code in `S:\MP\MPNext`).
Timeouts + `redirect:"error"`; path guard; encoded keys; guarded JSON parse; token-response validation; one 401
retry after forced refresh; negative cache on token failure; `guards.ts` for table / identifier / recordId;
remove `$ignorePermissions`; log identifiers and shape only.
**Out of scope (owner decision 5 — skipped):** the deny-all stored-procedure allowlist — see
`2026-09-30-held-stored-procedure-allowlist.md`.

## Impact if not fixed
A hung MP request pins a function for its full timeout; a crafted identifier could reach unexpected API paths;
raw error objects can leak response bodies into logs.

## Resolution (2026-09-30)

Branch `fix/step5-mp-http-client-hardening`, two commits (Phase 8, Phase 9).

**Phase 8 — HTTP client** (`utils/http-client.ts`, `client.ts`, `auth/client-credentials.ts`, `utils/logger.ts`)
1. Every MP fetch has `AbortSignal.timeout` (20 s JSON, 60 s multipart, 10 s token; fresh per attempt) and
   `redirect: "error"`. The unauthenticated `/files/{uniqueId}` download has its own 20 s timeout and
   `redirect: "error"`.
2. `buildUrl` path guard: must start with `/`; refuses `..`, `?`, `#`, `\`, `%2e`/`%2f`/`%5c`, C0/DEL; the
   resolved URL must stay under the API root. Query keys are encoded (`$` and `@` kept literal).
3. `readJsonResponse`: 204 / `Content-Length: 0` → `undefined`; JSON content-type required; parse failures
   never leak a `SyntaxError` body fragment.
4. Token response validated (non-empty `access_token`, `token_type` bearer).
5. Both pipelines (`default`, `dev`) are a `TokenPipeline`: single-flight refresh, 5–30 s jittered negative
   cache after a failure, and 401 → invalidate-if-current → refresh → one retry.
6. Logs: structured `mp.request.failed` / `mp.token.*` events with method, GUID-redacted endpoint, status or
   `errorName`. `errorName` lives in `utils/logger.ts`.

**Phase 9 — provider services**
1. `services/guards.ts`: `sanitizeIdentifier`, `sanitizeRecordId` / `sanitizeUniqueId` (reusing
   `validatePositiveInt` / `validateGuid` from `src/lib/validation.ts`), `tableEndpoint`.
2. Table, File and Procedure services validate every path segment before any token work
   (`table.service.ts` copy methods' `recordId`, `deleteTableRecords` ids incl. non-array refusal).
3. `$ignorePermissions` removed from `GlobalFilterParams` and helper docs; `getGlobalFilters` forwards an
   allowlist (validated `$userId` only).
4. All ~25 `logger.error(msg, error)` sites replaced with `logger.error(event, { ids, error: errorName(e) })`.

**Not done (owner decision 5):** the deny-all stored-procedure allowlist — still held in
`2026-09-30-held-stored-procedure-allowlist.md`.

**Behaviour changes callers may notice:** table/procedure names that are not plain identifiers (spaces,
hyphens, dots) and non-integer record IDs now throw before any request; a successful response without a JSON
content-type now throws `unexpected content-type`; after a failed token refresh, calls fail fast for up to
30 s; the 401 error a caller sees has already been retried once with a fresh token.

**Tests / mutation checks:** see the PR. Each of timeout, redirect, path guard, 401 retry, token validation,
negative cache, table-name guard and recordId guard was reverted in turn and turned the suite red.

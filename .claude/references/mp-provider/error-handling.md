---
title: MP Provider Error Handling
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/helper.ts
  - src/lib/providers/ministry-platform/client.ts
  - src/lib/providers/ministry-platform/auth/client-credentials.ts
  - src/lib/providers/ministry-platform/utils/http-client.ts
  - src/lib/providers/ministry-platform/services/guards.ts
symbols:
  - HttpClient
  - MinistryPlatformClient
  - MPHelper
  - errorName
related:
  - client.md
  - architecture.md
last_verified: 2026-09-30
---

## Purpose
How Ministry Platform API errors, token-refresh errors, input-guard refusals and Zod validation errors surface up the stack. No layer swallows errors. Every thrown message and log line carries **identifiers and shape only** (CLAUDE.md rule 14): method, redacted path, status, validated table/procedure name or record ID, and `errorName(error)` — never a response body, request body, `$filter`, full URL, file unique ID, or the raw error object.

## Key concepts

- **Every layer re-throws.** Services log a structured event (`logger.error('mp.<area>.<op>_failed', { ...ids, error: errorName(e) })`) and re-throw the original error.
- **Error shape is `Error`, not a custom class.** Consumers must read `.message` for the status code.
- **Guards throw before any token or network work**, with a fixed message naming the field.
- **One automatic retry exists:** a 401 triggers a forced token refresh and a single retry. Nothing else is retried.

## Error taxonomy

| Layer | Trigger | Message |
|-------|---------|---------|
| Guard | Bad table / procedure name | `Invalid table name` / `Invalid procedure name` |
| Guard | Bad record / file / user ID | `Expected positive integer for record ID` (`file ID`, `user ID`) |
| Guard | Non-array `ids` to `deleteTableRecords` | `Invalid record IDs` |
| Guard | Bad file unique ID | `Invalid GUID format` |
| HttpClient | Unsafe endpoint (traversal, `?#\`, encoded forms, control chars) | `Refusing unsafe MP API endpoint` |
| HttpClient | Non-2xx (after the one 401 retry) | `${METHOD} ${endpoint} failed: ${status} ${statusText}` |
| HttpClient | Network error / timeout / refused redirect | `${METHOD} ${endpoint} failed: ${errorName}` (e.g. `TimeoutError`) |
| HttpClient | 2xx with non-JSON content-type | `${METHOD} ${endpoint} failed: unexpected content-type` |
| HttpClient | 2xx with malformed JSON | `${METHOD} ${endpoint} failed: invalid JSON response` |
| Token | Network / timeout / redirect | `Failed to get client credentials token: ${errorName}` |
| Token | Non-2xx | `Failed to get client credentials token: ${status} ${statusText}` |
| Token | 200 without usable bearer | `Failed to get client credentials token: invalid token response` |
| Token | Within negative-cache window | `MP access token unavailable: recent refresh failed` |
| Token | Dev env vars missing | `Dev client credentials are not configured...` |
| FileService | Download non-2xx | `GET /files/{uniqueId} failed: ${status} ${statusText}` |
| MPHelper | Zod parse fail on create/update | `Validation failed for record ${index}: ...` (no API call made) |

`${endpoint}` is the path only, with GUIDs replaced by `{uniqueId}`.

## Log events

| Event | Fields |
|---|---|
| `mp.request.failed` | `method, endpoint, status, statusText` or `method, endpoint, error` |
| `mp.token.refresh_after_401_failed` | `method, endpoint, error` |
| `mp.token.refresh_failed` | `profile, error` |
| `mp.table.*_failed` | `table`, optional `recordId` / `count`, `error` |
| `mp.procs.execute_failed` / `mp.procs.list_failed` | `procedure` (validated), `error` |
| `mp.files.*_failed`, `mp.domain.*`, `mp.metadata.*`, `mp.communication.*`, `mp.message.*` | `error` (plus `table` where validated) |

All are written as `console.error('[MP]', event, fields)` via `logger.error`.

## Consumer guidance

- **Detecting 401/404:** `e.message.includes('404')`. There is no structured error type.
- **A 401 you see is after a retry** with a freshly issued token — it is not a stale-cache race.
- **Zod failures short-circuit the API call**, and the re-wrapped `Error` only carries `.message`.

## Related docs
- `client.md` — token pipelines, HttpClient request path
- `architecture.md` — layering diagram

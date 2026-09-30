---
title: MinistryPlatformClient & HttpClient
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/client.ts
  - src/lib/providers/ministry-platform/auth/client-credentials.ts
  - src/lib/providers/ministry-platform/utils/http-client.ts
  - src/lib/providers/ministry-platform/utils/logger.ts
symbols:
  - MinistryPlatformClient
  - HttpClient
  - readJsonResponse
  - redactEndpoint
  - getClientCredentialsToken
  - ClientCredentialsToken
  - CredentialProfile
  - logger
  - errorName
related:
  - architecture.md
  - error-handling.md
  - ../auth/README.md
last_verified: 2026-09-30
---

## Purpose
`MinistryPlatformClient` manages the OAuth2 **client credentials** token lifecycle and owns the `HttpClient` that every service uses. This is the machine-to-machine pipeline (scope `dataplatform/scopes/all` — admin level); it is **separate** from the Better Auth user login flow. Because every request carries an admin-level bearer, the client is hardened (Step 5, 2026-09-30): deadlines, no redirects, a path guard, safe JSON parsing, token validation, single-flight refresh with a negative cache, and a single 401 retry.

## Files
- `client.ts` — `MinistryPlatformClient`; an internal `TokenPipeline` per credential profile (`default`, `dev`)
- `auth/client-credentials.ts` — token-endpoint POST + response validation
- `utils/http-client.ts` — `HttpClient`, `readJsonResponse`, `redactEndpoint`, `API_TIMEOUT_MS`, `UPLOAD_TIMEOUT_MS`
- `utils/logger.ts` — `logger` (`[MP]` prefix, `error` only) and `errorName`
- Tests: `client.test.ts`, `auth/client-credentials.test.ts`, `utils/http-client.test.ts`, `utils/logger.test.ts`

## Token pipelines (`client.ts`)

| Behavior | Detail |
|---|---|
| Lifetime | Fixed `TOKEN_LIFE = 5 min` (ignores `expires_in`; MP issues 1 h tokens) |
| Single-flight | Concurrent `ensureValid*()` callers share one in-flight refresh |
| Negative cache | After a failed refresh, calls fail fast with `MP access token unavailable: recent refresh failed` for 5 s + up to 25 s jitter (`NEGATIVE_CACHE_MIN_MS`, `NEGATIVE_CACHE_JITTER_MS`) |
| 401 hook | Each pipeline's `HttpClient` gets `onUnauthorized(rejectedToken)`: invalidates only if the rejected token is still current (a burst of 401s → one refresh), then refreshes |
| Isolation | `default` and `dev` have separate token, expiry, negative cache, and `HttpClient`. `dev` is used only by `ProcedureService` for `api_dev_*` |
| Logging | `logger.error('mp.token.refresh_failed', { profile, error: errorName(e) })` — never the raw error |

Public API is unchanged: `ensureValidToken()`, `ensureValidDevToken()`, `getHttpClient()`, `getDevHttpClient()`.

## Token request (`auth/client-credentials.ts`)

- `POST {MINISTRY_PLATFORM_BASE_URL}/oauth/connect/token`, form-encoded, `redirect: "error"` (a 307/308 would re-send `client_secret`), `AbortSignal.timeout(TOKEN_TIMEOUT_MS = 10 s)`.
- Network failure / timeout / refused redirect → `Failed to get client credentials token: <errorName>`.
- Non-2xx → `Failed to get client credentials token: <status> <statusText>` (never the body).
- 200 is parsed with `readJsonResponse` and must have a non-empty string `access_token` and `token_type` `bearer` (case-insensitive), else `...: invalid token response`. Returns `ClientCredentialsToken`.
- `'dev'` profile requires `MINISTRY_PLATFORM_DEV_CLIENT_ID` and `_SECRET`; missing → `Dev client credentials are not configured...` before any fetch.

## `HttpClient` (`utils/http-client.ts`)

`new HttpClient(baseUrl, getToken, onUnauthorized?)`. Methods `get`, `post`, `postFormData`, `put`, `putFormData`, `delete`, `buildUrl` — all route through one private `request()`.

Every request:
1. **Path guard** (`buildUrl` → `assertSafeEndpoint`): endpoint must be a string starting with `/` and must not match `/\.\.|[?#\\]|%2e|%2f|%5c|[\u0000-\u001f\u007f]/i`; the resolved URL must stay under the base URL. Otherwise `Refusing unsafe MP API endpoint` (no fetch).
2. **Query string**: `undefined`/`null` dropped, arrays repeat the key, values `encodeURIComponent`ed, **keys encoded too** with `$` and `@` kept literal.
3. **Fetch** with `redirect: 'error'` and a fresh `AbortSignal.timeout` per attempt (`API_TIMEOUT_MS = 20 s`; `UPLOAD_TIMEOUT_MS = 60 s` for FormData). `Content-Type: application/json` only for JSON bodies.
4. **401** with an `onUnauthorized` hook → refresh → retry **once**. A failed refresh logs `mp.token.refresh_after_401_failed` and surfaces the original 401.
5. **Non-2xx** → logs `mp.request.failed { method, endpoint, status, statusText }`, throws `${METHOD} ${endpoint} failed: ${status} ${statusText}`.
6. **Network error / timeout / refused redirect** → logs `mp.request.failed { method, endpoint, error }`, throws `${METHOD} ${endpoint} failed: ${errorName}` (e.g. `TimeoutError`, `TypeError`).
7. **Success** → `readJsonResponse`: 204 or `Content-Length: 0` → `undefined`; content-type must be `application/json` or `application/*+json` (else `...: unexpected content-type`); a parse failure → `...: invalid JSON response` (the V8 `SyntaxError`, which quotes the body, never escapes).

`endpoint` in logs and messages is `redactEndpoint(endpoint)`: path only (never the query string, which carries `$filter`), GUIDs replaced with `{uniqueId}` (MP serves `/files/{uniqueId}` unauthenticated, so the ID is a download capability).

## Gotchas

- **Services must still call `ensureValidToken()` first.** The 401 hook covers revocation, not a cold client.
- **The path guard is defense in depth.** Provider services validate segments themselves (`services/guards.ts`); `encodeURIComponent('..') === '..'`, so the central guard is what catches a missed one.
- **An empty 200 without `Content-Length: 0` and without a JSON content-type throws** `unexpected content-type`. Previously `response.json()` threw a `SyntaxError` there anyway.
- **Negative cache applies to config errors too** — a missing dev credential fails fast for up to 30 s after the first failure.
- **`errorName` returns only a class-name-shaped `name`** (`^[A-Za-z]{1,64}$`), else `typeof`. Use it for every caught error you log.

## Related docs
- `architecture.md` — layering overview
- `error-handling.md` — error messages at each layer
- `services/*.md` — per-service path guards

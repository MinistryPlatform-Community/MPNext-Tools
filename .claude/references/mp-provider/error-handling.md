---
title: MP Provider Error Handling
domain: mp-provider
type: reference
applies_to:
  - src/lib/providers/ministry-platform/helper.ts
  - src/lib/providers/ministry-platform/provider.ts
  - src/lib/providers/ministry-platform/client.ts
  - src/lib/providers/ministry-platform/auth/client-credentials.ts
  - src/lib/providers/ministry-platform/utils/http-client.ts
symbols:
  - HttpClient
  - MinistryPlatformClient
  - MPHelper
related:
  - client.md
  - architecture.md
last_verified: 2026-04-17
---

## Purpose
How Ministry Platform API errors (401/404/409/500), OAuth token-refresh errors, and Zod validation errors surface up the stack. No layer swallows errors; messages are wrapped/augmented but the original error chain is preserved.

## Files
- `src/lib/providers/ministry-platform/utils/http-client.ts:24-35, 51-62, 78-82, 105-114, 131-134, 149-153` — where HTTP errors are thrown
- `src/lib/providers/ministry-platform/client.ts:57-67, 82-92` — token refresh error paths
- `src/lib/providers/ministry-platform/auth/client-credentials.ts:24-26` — OAuth response error
- `src/lib/providers/ministry-platform/helper.ts:186-196, 269-279` — Zod validation wrapping

## Key concepts

- **Every layer wraps but re-throws.** `HttpClient` builds a readable `Error`, `MPHelper` re-wraps Zod errors, `client.ts` just re-throws after logging
- **Error shape is `Error`, not a custom class.** There is no `MPApiError` type; consumers must parse `.message` to get status codes
- **401/404/409/500 are indistinguishable by type** at the TypeScript level — only the message string contains the status code
- **Token-refresh errors are eagerly logged** via `logger.error("Failed to refresh token:", error)` then re-thrown (`client.ts:63-66`)
- **FormData errors lose response body.** `postFormData`/`putFormData`/`delete` throw without calling `response.text()`

## Error taxonomy

| Layer | Trigger | Thrown at | Error message pattern | Caught at |
|-------|---------|-----------|----------------------|-----------|
| OAuth | Non-2xx from `/oauth/connect/token` | `auth/client-credentials.ts:25` | `Failed to get client credentials token: ${statusText}` | `client.ts:63-66` (logs, re-throws); ultimately bubbles to service/caller |
| OAuth | Dev env vars missing | `auth/client-credentials.ts:36` | `Dev client credentials are not configured. Set MINISTRY_PLATFORM_DEV_CLIENT_ID and MINISTRY_PLATFORM_DEV_CLIENT_SECRET to execute api_dev_* stored procedures.` | Service caller (or test) |
| OAuth | Network failure during token POST | `auth/client-credentials.ts:16` (fetch rejects) | Original `TypeError: fetch failed` etc. | `client.ts:63-66` logs + re-throws |
| HTTP | GET non-2xx | `utils/http-client.ts:32` | `GET ${endpoint} failed: ${status} ${statusText}[ - ${responseBody}]` | Service method (re-thrown up) |
| HTTP | POST non-2xx | `utils/http-client.ts:59` | `POST ${endpoint} failed: ${status} ${statusText}[ - ${responseBody}]` | Service method |
| HTTP | POST FormData non-2xx | `utils/http-client.ts:79` | `POST ${endpoint} failed: ${status} ${statusText}` (no body) | Service method |
| HTTP | PUT non-2xx | `utils/http-client.ts:112` | `PUT ${endpoint} failed: ${status} ${statusText}` (logs body but doesn't include) | Service method |
| HTTP | PUT FormData non-2xx | `utils/http-client.ts:132` | `PUT ${endpoint} failed: ${status} ${statusText}` (no body) | Service method |
| HTTP | DELETE non-2xx | `utils/http-client.ts:150` | `DELETE ${endpoint} failed: ${status} ${statusText}` (no body) | Service method |
| validation | Zod parse fail on create | `helper.ts:190` | `Validation failed for record ${index}: ${zodError.message}` | Caller (no API call made) |
| validation | Zod parse fail on update | `helper.ts:273` | `Validation failed for record ${index}: ${zodError.message}` | Caller (no API call made) |

## Code: the wrapping pattern

### HttpClient — GET/POST wrap status into message

```typescript
// src/lib/providers/ministry-platform/utils/http-client.ts:24-35
if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    logger.error("GET Request failed:", {
        status: response.status,
        statusText: response.statusText,
        url,
        responseBody: responseText
    });
    throw new Error(`GET ${endpoint} failed: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`);
}
```

POST uses the same pattern (`http-client.ts:51-62`). PUT logs the body but omits it from the thrown message (`http-client.ts:105-114`).

### MinistryPlatformClient — log + re-throw

```typescript
// src/lib/providers/ministry-platform/client.ts:57-67
try {
    const creds = await getClientCredentialsToken();
    this.token = creds.access_token;
    this.expiresAt = new Date(Date.now() + TOKEN_LIFE);
    logger.debug("Token refreshed. Expires at:", this.expiresAt);
} catch (error) {
    logger.error("Failed to refresh token:", error);
    throw error;
}
```

Re-throws the original error unchanged — test `client.test.ts:110-118` verifies OAuth errors bubble through with their original message.

### MPHelper — Zod re-wrap

```typescript
// src/lib/providers/ministry-platform/helper.ts:185-199
validatedRecords = records.map((record, index) => {
    try {
        return schema.parse(record) as T;
    } catch (validationError) {
        throw new Error(
            `Validation failed for record ${index}: ${
                validationError instanceof Error
                    ? validationError.message
                    : String(validationError)
            }`
        );
    }
});
```

Rewraps `z.ZodError` into a plain `Error` with the index prefixed, which loses the structured issue list (only `.message` survives). Test `helper.test.ts:238-252` pins this behavior ("should include record index in validation error").

## HTTP status → expected behavior

| Status | What it usually means in MP | Where it appears |
|--------|------------------------------|------------------|
| 400 Bad Request | Malformed filter, invalid body, validation error | All write methods |
| 401 Unauthorized | Token missing/expired/rejected | Any method with a stale token |
| 403 Forbidden | MP user permissions insufficient | Table CRUD on restricted tables |
| 404 Not Found | Unknown table, unknown record id, unknown procedure | Reads and updates |
| 409 Conflict | Concurrent update / primary-key conflict | Create and update |
| 413 Payload Too Large | Upload exceeds MP limit | `postFormData`, `putFormData` |
| 500 Internal Server Error | MP backend crash / misconfigured proc | Any |

The provider does **not** retry any of these automatically — a 401 resulting from a race between MP revoking a token early and the 5-minute cache will propagate as a failure.

## Known error-handling limitations (from tests)

- `client.test.ts:120-147` — Concurrent `ensureValidToken` calls are not deduplicated; each triggers a separate fetch. Under a transient OAuth failure, they each see the same error.
- `client.test.ts:348-366` — After a failed refresh, state is not poisoned: a retry succeeds cleanly on the next call.
- `http-client.test.ts:140-176` — Tests pin the exact message shape for `404 Not Found`, `401 Unauthorized`, `500 Internal Server Error` on GET.
- `http-client.test.ts:240-251` — POST 400 → `POST ${endpoint} failed: 400 Bad Request`.
- `http-client.test.ts:281-292` — `postFormData` 413 → omits response body.
- `http-client.test.ts:319-331` — PUT 400 — test asserts the message does **not** include the response body (only logs it).
- `http-client.test.ts:397-408` — DELETE 403 → message has no body.

## Consumer guidance

- **Detecting 401/404:** `try { await mp.getTableRecords(...) } catch (e) { if (e.message.includes('401')) { /* auth */ } }`. There is no structured error shape.
- **Zod failures short-circuit the API call.** If validation fails in `createTableRecords`/`updateTableRecords`, the request is never sent.
- **Do not assume the original `ZodError` structure.** The re-wrapped `Error` only carries `.message`.
- **`logger.error` always fires** — response bodies may end up in production logs. Sensitive MP data could be logged on error.

## Related docs
- `client.md` — token-refresh flow and dev pipeline
- `architecture.md` — layering diagram

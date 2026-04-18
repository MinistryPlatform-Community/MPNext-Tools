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
  - getClientCredentialsToken
  - CredentialProfile
  - logger
related:
  - architecture.md
  - error-handling.md
  - ../auth/README.md
last_verified: 2026-04-17
---

## Purpose
`MinistryPlatformClient` manages the OAuth2 **client credentials** token lifecycle and owns the `HttpClient` that every service uses. This flow is the machine-to-machine pipeline used by the server; it is **separate** from the Better Auth / `genericOAuth` user login flow.

## Files
- `src/lib/providers/ministry-platform/client.ts` — `MinistryPlatformClient` (default + dev pipelines)
- `src/lib/providers/ministry-platform/auth/client-credentials.ts` — token-endpoint POST
- `src/lib/providers/ministry-platform/auth/client-credentials.test.ts` — token tests
- `src/lib/providers/ministry-platform/utils/http-client.ts` — `HttpClient`
- `src/lib/providers/ministry-platform/utils/http-client.test.ts` — HTTP tests
- `src/lib/providers/ministry-platform/utils/logger.ts` — `logger` (`[MP]` prefix)
- `src/lib/providers/ministry-platform/utils/logger.test.ts` — logger tests
- `src/lib/providers/ministry-platform/client.test.ts` — client tests (token lifecycle, dev pipeline)

## Key concepts

- **OAuth2 client credentials** grant — scope `http://www.thinkministry.com/dataplatform/scopes/all`
- **5-minute internal token life** — client refreshes long before the server's typical `expires_in` (3600s) to avoid edge misses; `TOKEN_LIFE = 5 * 60 * 1000` in `client.ts:6`
- **Two isolated pipelines** on one client — default (prod) and `dev` (for `api_dev_*` stored procs only); each has its own token cache, its own `expiresAt`, and its own `HttpClient`
- **Token injection via closure** — `HttpClient` reads the current token through `() => this.token`; the getter re-captures the latest value on every request
- **Endpoint prefix:** all API paths are joined to `process.env.MINISTRY_PLATFORM_BASE_URL` (e.g. `/tables/Contacts`, `/tasks/generate-sequence`) — the base URL already includes the MP domain

## API / Interface

### `MinistryPlatformClient`

```typescript
// src/lib/providers/ministry-platform/client.ts:21-42
export class MinistryPlatformClient {
    private token: string = "";
    private expiresAt: Date = new Date(0);
    private httpClient: HttpClient;

    private devToken: string = "";
    private devExpiresAt: Date = new Date(0);
    private devHttpClient: HttpClient;

    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.MINISTRY_PLATFORM_BASE_URL!;
        this.httpClient = new HttpClient(this.baseUrl, () => this.token);
        this.devHttpClient = new HttpClient(this.baseUrl, () => this.devToken);
    }
```

Public methods:

| Method | Purpose |
|--------|---------|
| `ensureValidToken()` | Refreshes default token if expired |
| `ensureValidDevToken()` | Refreshes dev token if expired (throws if dev env vars missing) |
| `getHttpClient()` | Returns default HttpClient (same instance every call) |
| `getDevHttpClient()` | Returns dev HttpClient (same instance every call) |

### `getClientCredentialsToken(profile?)`

```typescript
// src/lib/providers/ministry-platform/auth/client-credentials.ts:1-29
export type CredentialProfile = 'default' | 'dev';

export async function getClientCredentialsToken(profile: CredentialProfile = 'default') {
  const mpBaseUrl = process.env.MINISTRY_PLATFORM_BASE_URL!;
  const mpOauthUrl = `${mpBaseUrl}/oauth`;

  const { clientId, clientSecret } = resolveCredentials(profile);

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "http://www.thinkministry.com/dataplatform/scopes/all",
  });

  const response = await fetch(`${mpOauthUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get client credentials token: ${response.statusText}`);
  }

  return await response.json();
}
```

Environment variables:

| Var | Purpose | Pipeline |
|-----|---------|----------|
| `MINISTRY_PLATFORM_BASE_URL` | Base URL for all requests + OAuth | both |
| `MINISTRY_PLATFORM_CLIENT_ID` | OAuth client id | default |
| `MINISTRY_PLATFORM_CLIENT_SECRET` | OAuth client secret | default |
| `MINISTRY_PLATFORM_DEV_CLIENT_ID` | Dev OAuth client id | dev |
| `MINISTRY_PLATFORM_DEV_CLIENT_SECRET` | Dev OAuth client secret | dev |

`resolveCredentials('dev')` throws `Dev client credentials are not configured...` if either dev var is missing (`client-credentials.ts:35-40`, verified by test `client-credentials.test.ts:139-156`).

### `HttpClient`

```typescript
// src/lib/providers/ministry-platform/utils/http-client.ts:4-11
export class HttpClient {
    private baseUrl: string;
    private getToken: () => string;

    constructor(baseUrl: string, getToken: () => string) {
        this.baseUrl = baseUrl;
        this.getToken = getToken;
    }
```

Methods:

| Method | Sends | Notes |
|--------|-------|-------|
| `get<T>(endpoint, queryParams?)` | GET | no body |
| `post<T>(endpoint, body?, queryParams?)` | POST + JSON | `Content-Type: application/json` |
| `postFormData<T>(endpoint, formData, queryParams?)` | POST + FormData | no `Content-Type` (browser sets it with boundary) |
| `put<T>(endpoint, body, queryParams?)` | PUT + JSON | debug-logs request; error text included |
| `putFormData<T>(endpoint, formData, queryParams?)` | PUT + FormData | no `Content-Type` |
| `delete<T>(endpoint, queryParams?)` | DELETE | no body |
| `buildUrl(endpoint, queryParams?)` | (helper) | public, used by provider for `/tasks/generate-sequence` |

All methods inject `Authorization: Bearer ${this.getToken()}` on every call (`http-client.ts:18-22, 43-47, 69-73, 96-100, 121-125, 143-147`).

Query-string builder (`http-client.ts:164-174`):
- `undefined`/`null` values are dropped
- Arrays emit `key=v1&key=v2&key=v3`
- All values run through `encodeURIComponent`

### `logger`

```typescript
// src/lib/providers/ministry-platform/utils/logger.ts
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  debug: isDev
    ? (...args: unknown[]) => console.log('[MP]', ...args)
    : () => {},
  error: (...args: unknown[]) => console.error('[MP]', ...args),
};
```

`debug` is a no-op in production; `error` always writes. Prefix `[MP]`.

## How it works

### Token refresh algorithm (default pipeline)

```typescript
// src/lib/providers/ministry-platform/client.ts:49-68
public async ensureValidToken(): Promise<void> {
    logger.debug("Checking token validity...");
    logger.debug("Expires at:", this.expiresAt);
    logger.debug("Current time:", new Date());

    if (this.expiresAt < new Date()) {
        logger.debug("Token expired, refreshing...");
        try {
            const creds = await getClientCredentialsToken();
            this.token = creds.access_token;
            this.expiresAt = new Date(Date.now() + TOKEN_LIFE);  // 5-min buffer
            logger.debug("Token refreshed. Expires at:", this.expiresAt);
        } catch (error) {
            logger.error("Failed to refresh token:", error);
            throw error;
        }
    }
}
```

Behavior verified by `client.test.ts`:
- Initial state `expiresAt = new Date(0)` → first call always fetches (`client.test.ts:47-60`)
- Within 5-minute window → no fetch (`client.test.ts:62-81`)
- After 5-minute window → refreshes (`client.test.ts:83-108`)
- Precise boundary: `4m59s` no refresh, `5m+` refreshes (`client.test.ts:151-183`)
- Errors from `getClientCredentialsToken` propagate (`client.test.ts:110-118`)

### Dev token pipeline

`ensureValidDevToken()` mirrors the default but passes `'dev'` to `getClientCredentialsToken` (`client.ts:75-94`). The two pipelines are fully independent:
- Separate token + `expiresAt` fields
- Separate `HttpClient` instance
- Dev-only callers: `ProcedureService` when the procedure name matches `api_dev_*`
- Verified independent by `client.test.ts:240-322`

### Request path

```
Service.someMethod(args)
  → client.ensureValidToken()
      → (if expired) getClientCredentialsToken() → POST {baseUrl}/oauth/connect/token
      → stores access_token in this.token + sets this.expiresAt = now + 5min
  → client.getHttpClient().get/post/put/delete(endpoint, body?, queryParams?)
      → fetch({baseUrl}{endpoint}?{query}, { Authorization: Bearer ${this.getToken()} })
      → if !response.ok: throw `${METHOD} ${endpoint} failed: ${status} ${statusText}[ - ${body}]`
      → response.json() as T
```

### URL building

```typescript
// src/lib/providers/ministry-platform/utils/http-client.ts:156-174
public buildUrl(endpoint: string, queryParams?: QueryParams): string {
    const url = `${this.baseUrl}${endpoint}`;
    if (!queryParams) return url;
    const queryString = this.buildQueryString(queryParams);
    return queryString ? `${url}?${queryString}` : url;
}

private buildQueryString(params: QueryParams): string {
    return Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return value.map(v => `${key}=${encodeURIComponent(String(v))}`).join('&');
            }
            return `${key}=${encodeURIComponent(String(value))}`;
        })
        .join('&');
}
```

## Usage

### Consuming the client from a service (real example — pattern)

```typescript
// Typical service pattern, mirrored in TableService / ProcedureService / etc.
async someMethod(table: string, params?: QueryParams): Promise<T[]> {
    await this.client.ensureValidToken();
    return this.client.getHttpClient().get<T[]>(`/tables/${table}`, params);
}
```

### Direct HttpClient usage from provider (real example)

```typescript
// src/lib/providers/ministry-platform/provider.ts:228-244
public async generateSequence(pattern: RecurrencePattern): Promise<string[]> {
    await this.client.ensureValidToken();
    const queryParams: QueryParams = {
        $type: pattern.Type,
        $interval: pattern.Interval,
        $startDate: pattern.StartDate,
    };
    if (pattern.EndDate) queryParams.$endDate = pattern.EndDate;
    // ... other optional fields
    return this.client.getHttpClient().get<string[]>('/tasks/generate-sequence', queryParams);
}
```

## Gotchas

- **No request-level token refresh.** `HttpClient` does not call `ensureValidToken` itself — every service method must call it first. A service that forgets to `await this.client.ensureValidToken()` will ship `Authorization: Bearer ` (empty) on a cold client; see `architecture.md` for call-site list.
- **5-minute buffer, not JWT `exp`.** The client ignores `expires_in` from the OAuth response and hard-codes 5 minutes via `TOKEN_LIFE`. If MP ever issues tokens shorter than 5 minutes, default pipeline breaks.
- **No concurrency control.** Two concurrent `ensureValidToken` calls on a cold client each trigger a fetch (see `client.test.ts:120-147`). Documented as acceptable current behavior, not a deduped singleton-in-flight.
- **`getHttpClient()` always returns the same instance.** Do not construct a new `HttpClient` — it would not share the token getter.
- **FormData error paths lose the response body.** `postFormData` and `putFormData` and `delete` throw without including `response.text()`, unlike `get`/`post`/`put`.
- **Logger leaks base URL and partial response bodies on error.** `logger.error` is always on; error logs may contain full URLs with query strings and raw response text.

## Related docs
- `architecture.md` — layering overview
- `error-handling.md` — how errors wrap at each layer
- `../auth/README.md` — user-facing Better Auth OAuth (a different flow)

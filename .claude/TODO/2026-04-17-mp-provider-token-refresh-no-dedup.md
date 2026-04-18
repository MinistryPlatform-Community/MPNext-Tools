---
title: ensureValidToken has no concurrent-call deduplication
severity: medium
tags: [refactor, perf]
area: mp-provider
files:
  - src/lib/providers/ministry-platform/client.ts
  - src/lib/providers/ministry-platform/client.test.ts
discovered: 2026-04-17
discovered_by: mp-provider-core
status: open
---

## Problem
`MinistryPlatformClient.ensureValidToken` (and `ensureValidDevToken`) check `this.expiresAt < new Date()` and then call `getClientCredentialsToken()` if expired. There is no guard against concurrent callers; on a cold client, N parallel service calls trigger N simultaneous OAuth token POSTs.

The test file pins this as known behavior:

```typescript
// src/lib/providers/ministry-platform/client.test.ts:144-146
// Each call triggers getClientCredentialsToken because there's no deduplication
// This is current behavior - could be optimized in the future
expect(mockGetClientCredentialsToken).toHaveBeenCalled();
```

On a Next.js server that warms up multiple server actions in parallel after a cold restart, this can burst OAuth endpoint and waste tokens (each OAuth response from MP invalidates the previous one in some deployments).

## Evidence
- `src/lib/providers/ministry-platform/client.ts:49-68` — no in-flight promise cache
- `src/lib/providers/ministry-platform/client.test.ts:120-147` — test named "should handle concurrent ensureValidToken calls" that just verifies the fetches complete, not that they deduplicate

## Proposed fix
Cache the in-flight refresh promise:

```typescript
private refreshPromise: Promise<void> | null = null;

public async ensureValidToken(): Promise<void> {
    if (this.expiresAt >= new Date()) return;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
        try {
            const creds = await getClientCredentialsToken();
            this.token = creds.access_token;
            this.expiresAt = new Date(Date.now() + TOKEN_LIFE);
        } finally {
            this.refreshPromise = null;
        }
    })();

    return this.refreshPromise;
}
```

Update the test: the N-parallel case should assert `toHaveBeenCalledTimes(1)`.

## Impact if not fixed
Minor in practice (OAuth endpoint can handle a burst of N sibling requests on boot), but violates the principle of least surprise and burns tokens needlessly.

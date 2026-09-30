---
title: "Step 5 — MP HTTP client and provider-service hardening"
severity: medium
tags: [security, missing-test]
area: mp-provider
files: [src/lib/providers/ministry-platform/utils/http-client.ts, src/lib/providers/ministry-platform/client.ts, src/lib/providers/ministry-platform/services/table.service.ts, src/lib/providers/ministry-platform/types/provider.types.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P8/P9)
status: open
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

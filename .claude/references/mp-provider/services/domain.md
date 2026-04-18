---
title: DomainService — Domain Info & Global Filters
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/domain.service.ts]
symbols: [DomainService, getDomainInfo, getGlobalFilters]
related: [../README.md, metadata.md]
last_verified: 2026-04-17
---

## Purpose
Read domain-level configuration (display name, timezone, culture, MFA settings) and fetch the lookup values for the domain's global filter.

## Files
- `src/lib/providers/ministry-platform/services/domain.service.ts` — implementation (42 lines)
- `src/lib/providers/ministry-platform/services/domain.service.test.ts` — tests (94 lines)

## Key concepts
- `getDomainInfo` hits `/domain` (no params). Authenticated; ties to the current access token's domain.
- `getGlobalFilters` hits `/domain/filters` with optional `$userId` and `$ignorePermissions` params. Returns `{ Key, Value }[]` where `Key: 0` represents "records with no filter assigned."
- The domain's global filter table name is in `DomainInfo.GlobalFilterTableName` (may be undefined on domains without global filters configured).

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/domain.service.ts`:

```typescript
public async getDomainInfo(): Promise<DomainInfo>

public async getGlobalFilters(params?: GlobalFilterParams): Promise<GlobalFilterItem[]>
```

### Endpoint → method map

| Method | HTTP | Endpoint |
|---|---|---|
| `getDomainInfo` | GET | `/domain` |
| `getGlobalFilters` | GET | `/domain/filters` (optional `$userId`, `$ignorePermissions`) |

### Type shapes

From `src/lib/providers/ministry-platform/types/provider.types.ts`:

```typescript
// :78
export interface DomainInfo {
  DisplayName: string;
  ImageFileId?: number;
  TimeZoneName: string;
  CultureName: string;
  PasswordComplexityExpression?: string;
  PasswordComplexityMessage?: string;
  IsSimpleSignOnEnabled: boolean;
  IsUserTimeZoneEnabled: boolean;
  IsSmsMfaEnabled: boolean;
  CompanyName?: string;
  CompanyEmail?: string;
  CompanyPhone?: string;
  GlobalFilterTableName?: string;
  SiteNumber?: string;
}

// :95
export interface GlobalFilterItem {
  Key: number;
  Value: string;
}

// :100
export interface GlobalFilterParams {
  $ignorePermissions?: boolean;
  $userId?: number;
}
```

## How it works
- Both methods call `ensureValidToken()` then `getHttpClient().get(endpoint, params?)`.
- No URL encoding needed — endpoints are static.
- Errors propagate from `HttpClient` after `logger.error`.

## Usage

From tests (`domain.service.test.ts:66-74`):

```typescript
const filters = [{ Key: 1, Value: 'Global' }];
(mockHttpClient.get as any).mockResolvedValueOnce(filters);

const result = await service.getGlobalFilters({ $userId: 123 } as any);
// expect(mockHttpClient.get).toHaveBeenCalledWith('/domain/filters', { $userId: 123 });
```

Also exposed via `MPHelper.getDomainInfo` / `.getGlobalFilters` (`src/lib/providers/ministry-platform/helper.ts:346, :373`) — no direct callers in `src/services/**` or `src/components/**` as of this revision (greppable: no hits).

## Error handling

| Status | Operation | Test location |
|---|---|---|
| 403 Forbidden | `getGlobalFilters` | `domain.service.test.ts:76-80` |
| 500 Internal Server Error | `getDomainInfo` | `domain.service.test.ts:48-52` |

## Gotchas
- **`Key: 0` = unfiltered records** — documented in the JSDoc (`domain.service.ts:28-29`). Treat 0 as sentinel, not as a real filter id.
- **`$ignorePermissions: true` bypasses per-user filter scoping** — only usable where caller has admin context. MP 403s otherwise.
- **`GlobalFilterTableName` is optional** — on domains with no global filter configured, `DomainInfo.GlobalFilterTableName` is `undefined`, and `getGlobalFilters` still returns `[]` (not an error).
- **Response type is loose where MP sends more fields** — test fixture `{ DomainName: 'Test', DomainId: 1 }` does not match `DomainInfo` (which uses `DisplayName`, no `DomainId`). The mock is intentionally loose; production MP returns the `DomainInfo` shape.

## Related docs
- `../README.md` — provider overview
- `metadata.md` — companion service for table-level metadata

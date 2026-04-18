---
title: mp-provider
type: index
domain: mp-provider
---

## What's in this domain
Layered SDK for the Ministry Platform REST API: `MPHelper` facade → `MinistryPlatformProvider` singleton → per-domain services → `MinistryPlatformClient` (OAuth2 + HTTP) → `HttpClient` (low-level fetch).

## Layering (text diagram)

```
Consumers (services in src/services/, server actions)
        │
        ▼
   MPHelper                ← public, ergonomic facade (param mapping, Zod)
   src/lib/providers/ministry-platform/helper.ts
        │ new MPHelper() → MinistryPlatformProvider.getInstance()
        ▼
   MinistryPlatformProvider  ← singleton orchestrator
   src/lib/providers/ministry-platform/provider.ts
        │ holds one MinistryPlatformClient + six services
        ▼
   ┌────────────────────────────────────────────┐
   │ TableService  ProcedureService             │
   │ MetadataService  DomainService             │
   │ CommunicationService  FileService          │
   │ src/lib/providers/ministry-platform/services/
   └────────────────────────────────────────────┘
        │ all share the same client
        ▼
   MinistryPlatformClient      ← token cache + token getter
   src/lib/providers/ministry-platform/client.ts
        │ ensureValidToken() → getClientCredentialsToken()
        │ getHttpClient() → HttpClient bound to () => this.token
        ▼
   HttpClient                  ← GET/POST/PUT/DELETE, FormData, URL build
   src/lib/providers/ministry-platform/utils/http-client.ts
        │ fetch()
        ▼
   Ministry Platform REST API  (https://<domain>.ministryplatformapi.com)
```

## File map

| File | Purpose | When to read |
|------|---------|--------------|
| `architecture.md` | Stack layers, singleton rationale, entry-point semantics | First — to place other docs |
| `client.md` | `MinistryPlatformClient`, OAuth2 client credentials, token refresh, dev-token pipeline | When debugging auth or adding a new token-consuming surface |
| `type-generation.md` | `generate-types.ts` CLI, `--clean`, `--zod`, `--detailed`, model output (603 files) | When running `npm run mp:generate:models` or changing the generator |
| `error-handling.md` | How MP API errors (401/404/409/500), token-refresh errors, Zod errors surface | When diagnosing a failure at any layer |

Services (each MP service wrapping one area of the API) live in `services/` and are documented separately.

## Code surfaces

| Path | Role |
|------|------|
| `src/lib/providers/ministry-platform/helper.ts` | `MPHelper` — public API facade |
| `src/lib/providers/ministry-platform/provider.ts` | `MinistryPlatformProvider` — singleton |
| `src/lib/providers/ministry-platform/client.ts` | `MinistryPlatformClient` — token + HttpClient holder |
| `src/lib/providers/ministry-platform/index.ts` | Barrel: `MinistryPlatformProvider`, `MPHelper`, `MinistryPlatformClient`, types, models, services, auth |
| `src/lib/providers/ministry-platform/auth/client-credentials.ts` | `getClientCredentialsToken(profile)` |
| `src/lib/providers/ministry-platform/utils/http-client.ts` | `HttpClient` — fetch wrapper |
| `src/lib/providers/ministry-platform/utils/logger.ts` | `logger` — console wrapper gated on `NODE_ENV` |
| `src/lib/providers/ministry-platform/scripts/generate-types.ts` | Type-generator CLI |
| `src/lib/providers/ministry-platform/models/` | 603 generated model + Zod schema files |

## Related domains
- `../services/README.md` — app-level service singletons that instantiate `MPHelper`
- `../auth/README.md` — Better Auth user session flow (separate OAuth flow from client credentials)
- `../mp-schema/README.md` — generated DB schema and stored-procedure references

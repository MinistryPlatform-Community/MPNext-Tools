---
title: Test File Inventory
domain: testing
type: reference
applies_to: [src/**/*.test.ts, src/**/*.test.tsx]
symbols: []
related: [setup.md, cookbook.md]
last_verified: 2026-09-13
---

## Purpose
Test files grouped by area. Totals from the current facts snapshot:
**116 files / 1,535 test cases** (`vitest run`, see
`../_meta/facts/2026-09-13.md`).

> The per-file tables below were written at 37 files and have NOT been expanded
> to all 116. They remain accurate for the files they list. For anything not
> listed, the co-location rule is reliable: a source file `foo.ts` is tested by
> `foo.test.ts` beside it. Counts by area:
>
> | Area | Files |
> |---|---|
> | `src/app/**` | 23 |
> | `src/components/group-wizard` | 12 |
> | `src/lib/providers/ministry-platform` | 12 |
> | `src/lib/**` (excl. MP provider) | 12 |
> | `src/components/dev-panel` | 11 |
> | `src/components/address-labels` | 10 |
> | `src/components/template-editor` | 10 |
> | `src/services` | 9 |
> | `src/components/field-management` | 7 |
> | `src/components/*` (layout, shared-actions, tool, user-menu) | 6 |
> | `src/contexts` | 2 |
> | `src/` (proxy, auth) | 2 |

## Ministry Platform provider (12 files)

| Test File | What It Covers |
|---|---|
| `src/lib/providers/ministry-platform/helper.test.ts` | MPHelper CRUD, Zod validation, procedures, files, copy/recurrence/generateSequence |
| `src/lib/providers/ministry-platform/provider.test.ts` | Singleton, service delegation, generateSequence with optional fields |
| `src/lib/providers/ministry-platform/client.test.ts` | OAuth token lifecycle, refresh, concurrent calls (uses `vi.useFakeTimers`) |
| `src/lib/providers/ministry-platform/utils/http-client.test.ts` | HTTP methods, URL building, FormData, error handling |
| `src/lib/providers/ministry-platform/utils/logger.test.ts` | Debug vs production gating, error always logs |
| `src/lib/providers/ministry-platform/auth/client-credentials.test.ts` | OAuth2 `client_credentials` token flow |
| `src/lib/providers/ministry-platform/services/table.service.test.ts` | CRUD + `copyRecord` + `copyRecordWithSubpages` |
| `src/lib/providers/ministry-platform/services/communication.service.test.ts` | Communications and messages with/without attachments |
| `src/lib/providers/ministry-platform/services/domain.service.test.ts` | Domain info, global filters |
| `src/lib/providers/ministry-platform/services/metadata.service.test.ts` | Metadata refresh, tables search |
| `src/lib/providers/ministry-platform/services/procedure.service.test.ts` | Procedure listing + query/body execution with URL encoding |
| `src/lib/providers/ministry-platform/services/file.service.test.ts` | File CRUD, FormData building, unauthenticated blob retrieval |

## Services (5 files)

| Test File | What It Covers |
|---|---|
| `src/services/toolService.test.ts` | Page data, user tools, selection records, contact resolution, `listPages`, `listRoles`, `deployTool` |
| `src/services/groupService.test.ts` | Group CRUD and membership |
| `src/services/fieldManagementService.test.ts` | Pages, fields, table metadata, batched order updates |
| `src/services/addressLabelService.test.ts` | Address fetching, batching, single contact |
| `src/services/userService.test.ts` | Profile with roles/groups, `getUserIdByGuid`, GUID validation |

## Components (10 files)

| Test File | What It Covers |
|---|---|
| `src/components/address-labels/actions.test.ts` | PDF, DOCX, and template merge actions + error branches |
| `src/components/address-labels/word-document.test.ts` | `buildWordDocument` page layout and barcode branches |
| `src/components/field-management/actions.test.ts` | `fetchPages` / `fetchPageFieldData` column merge / `savePageFieldOrder` |
| `src/components/dev-panel/dev-panel.test.tsx` | Localhost + `NODE_ENV` gating, localStorage persistence, open/close toggling |
| `src/components/dev-panel/panels/deploy-tool-actions.test.ts` | Deploy-tool server actions (authz, validation, SP payload shaping) |
| `src/components/dev-panel/panels/selection-actions.test.ts` | Selection resolution server actions |
| `src/components/dev-panel/panels/user-tools-actions.test.ts` | Authorization checks, session validation |
| `src/components/layout/auth-wrapper.test.tsx` | `AuthWrapper` render gating based on session |
| `src/components/user-menu/actions.test.ts` | Sign-out action, OIDC logout redirect |
| `src/components/shared-actions/user.test.ts` | `getCurrentUserProfile` session-derived GUID lookup, `Unauthorized` on missing/empty `userGuid`, IDOR regression (caller-forged argument ignored), error propagation |

## Core lib (8 files)

| Test File | What It Covers |
|---|---|
| `src/lib/validation.test.ts` | GUID / positive int / column name / filter escaping |
| `src/lib/barcode-helpers.test.ts` | Barcode generation utilities |
| `src/lib/imb-encoder.test.ts` | USPS Intelligent Mail barcode encoding |
| `src/lib/postnet-encoder.test.ts` | POSTNET barcode encoding |
| `src/lib/label-stock.test.ts` | Label stock definitions and calculations |
| `src/lib/barcode-image.test.ts` | BMP rendering for IMb/POSTNET with JSON fallback |
| `src/auth.test.ts` | Name splitting, session structure, OAuth config |
| `src/proxy.test.ts` | Route protection, public paths, session, errors |

## Contexts (2 files)

| Test File | What It Covers |
|---|---|
| `src/contexts/user-context.test.tsx` | `UserProvider` lifecycle, profile loading, errors |
| `src/contexts/session-context.test.tsx` | `useAppSession` hook wrapper |

## Totals
- Files in this inventory: 37 (12 provider + 5 services + 10 component + 8 lib + 2 contexts)

## Known uncovered surfaces
- `src/lib/providers/ministry-platform/scripts/` (`build-sql-install.ts`, `generate-types.ts`, `generate-storedprocs.ts`) — CLI build scripts exercised via `npm run mp:build:install` / `npm run mp:generate:models`
- Auto-generated model files under `src/lib/providers/ministry-platform/models/` — excluded from coverage via `vitest.config.mts`

## Related docs
- `setup.md` — runner config
- `cookbook.md` — starting points per flavor
- `mocks.md` — required mock patterns

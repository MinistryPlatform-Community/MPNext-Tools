---
title: Test File Inventory
domain: testing
type: reference
applies_to: [src/**/*.test.ts, src/**/*.test.tsx]
symbols: []
related: [setup.md, cookbook.md]
last_verified: 2026-10-10
---

## Purpose
Every test file, grouped by area, with its case count from `vitest run`
(2026-10-11): **120 files / 2,237 test cases**. See
`../_meta/facts/2026-10-10.md`. Counts drift — trust a fresh `npx vitest run`
over this table. Co-location rule: `foo.ts` is tested by `foo.test.ts` beside it.
The "What It Covers" column is filled where it was verified; blank rows are
self-describing by file name.

## Counts by area

| Area | Files | Cases |
|---|---|---|
| `src/app/**` (pages, route handler, providers) | 22 | 406 |
| `src/` root (`auth.*`, `proxy`) | 11 | 250 |
| `src/components/address-labels` | 11 | 126 |
| `src/components/dev-panel` | 11 | 102 |
| `src/components/field-management` | 7 | 113 |
| `src/components/group-wizard` | 12 | 159 |
| `src/components/{layout,shared-actions,tool}` | 5 | 44 |
| `src/contexts` | 2 | 16 |
| `src/lib/providers/ministry-platform` | 16 | 521 |
| `src/lib/**` (excl. MP provider) | 14 | 255 |
| `src/services` | 9 | 245 |
| **Total** | **120** | **2,237** |

## `src/app/**` (pages, route handler, providers) (22 files, 406 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/app/(web)/error.test.tsx` | 12 |  |
| `src/app/(web)/no-access/page.test.tsx` | 4 | `/no-access` page incl. the `handleSignOut` form |
| `src/app/(web)/page.test.tsx` | 12 |  |
| `src/app/(web)/tools/addeditfamily/actions.test.ts` | 43 |  |
| `src/app/(web)/tools/addeditfamily/add-edit-family.test.tsx` | 43 |  |
| `src/app/(web)/tools/addeditfamily/page.test.tsx` | 10 |  |
| `src/app/(web)/tools/addresslabels/address-labels.test.tsx` | 23 |  |
| `src/app/(web)/tools/addresslabels/page.test.tsx` | 2 |  |
| `src/app/(web)/tools/fieldmanagement/field-management.test.tsx` | 15 |  |
| `src/app/(web)/tools/fieldmanagement/page.test.tsx` | 4 |  |
| `src/app/(web)/tools/groupwizard/group-wizard.test.tsx` | 20 |  |
| `src/app/(web)/tools/groupwizard/page.test.tsx` | 3 |  |
| `src/app/(web)/tools/layout.test.tsx` | 5 |  |
| `src/app/(web)/tools/require-tool-access.test.ts` | 9 | `requireToolAccess` page-level gate; asserts every tool page self-gates |
| `src/app/(web)/tools/template/page.test.tsx` | 4 |  |
| `src/app/(web)/tools/template/template-tool.test.tsx` | 12 |  |
| `src/app/api/auth/[...all]/route.test.ts` | 77 |  |
| `src/app/auth-error/page.test.tsx` | 16 |  |
| `src/app/global-error.test.tsx` | 8 |  |
| `src/app/providers.test.tsx` | 3 |  |
| `src/app/session-error/page.test.tsx` | 3 |  |
| `src/app/signin/page.test.tsx` | 78 |  |

## `src/` root (`auth.*`, `proxy`) (11 files, 250 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/auth.id-token-sign-in.test.ts` | 16 |  |
| `src/auth.ip-address.test.ts` | 24 |  |
| `src/auth.oidc-discovery.test.ts` | 28 |  |
| `src/auth.secret-guard.test.ts` | 25 |  |
| `src/auth.session-config.test.ts` | 9 |  |
| `src/auth.session-lifetime.test.ts` | 7 |  |
| `src/auth.shared-instance.test.ts` | 5 |  |
| `src/auth.test.ts` | 51 | Name splitting, session structure, OAuth config |
| `src/auth.user-info.test.ts` | 41 |  |
| `src/auth.user-oauth-tokens.test.ts` | 6 |  |
| `src/proxy.test.ts` | 38 | Route protection, public paths, session, errors |

## `src/components/address-labels` (11 files, 126 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/components/address-labels/actions.test.ts` | 53 | PDF, DOCX, and template merge actions + error branches |
| `src/components/address-labels/address-label.test.tsx` | 7 |  |
| `src/components/address-labels/address-labels-form.test.tsx` | 15 |  |
| `src/components/address-labels/address-labels-summary.test.tsx` | 8 |  |
| `src/components/address-labels/imb-barcode.test.tsx` | 6 |  |
| `src/components/address-labels/label-document.test.tsx` | 5 |  |
| `src/components/address-labels/mail-merge-tab.test.tsx` | 14 |  |
| `src/components/address-labels/merge-template.integration.test.ts` | 2 | Real (unmocked) `mergeTemplate` + PizZip run, incl. a forged-size zip bomb |
| `src/components/address-labels/postnet-barcode.test.tsx` | 5 |  |
| `src/components/address-labels/sample-template.test.ts` | 3 |  |
| `src/components/address-labels/word-document.test.ts` | 8 | `buildWordDocument` page layout and barcode branches |

## `src/components/dev-panel` (11 files, 102 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/components/dev-panel/dev-panel.test.tsx` | 11 | Localhost + `NODE_ENV` gating, localStorage persistence, open/close toggling |
| `src/components/dev-panel/panels/contact-records-actions.test.ts` | 3 |  |
| `src/components/dev-panel/panels/contact-records-panel.test.tsx` | 11 |  |
| `src/components/dev-panel/panels/deploy-tool-actions.test.ts` | 16 | Deploy-tool server actions (prod guard, session guard, delegation, env status) |
| `src/components/dev-panel/panels/deploy-tool-panel.test.tsx` | 22 |  |
| `src/components/dev-panel/panels/params-panel.test.tsx` | 8 |  |
| `src/components/dev-panel/panels/require-dev-session.test.ts` | 6 | `requireDevSession`: production refusal, session requirement |
| `src/components/dev-panel/panels/selection-actions.test.ts` | 4 | Selection resolution server action (dev-session guard, delegation) |
| `src/components/dev-panel/panels/selection-panel.test.tsx` | 9 |  |
| `src/components/dev-panel/panels/user-tools-actions.test.ts` | 3 | Dev-session guard, refusal propagation, delegation to `ToolService.getUserTools` |
| `src/components/dev-panel/panels/user-tools-panel.test.tsx` | 9 |  |

## `src/components/field-management` (7 files, 113 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/components/field-management/actions.test.ts` | 18 | `fetchPages` / `fetchPageFieldData` column merge / `savePageFieldOrder` |
| `src/components/field-management/field-order-editor.test.tsx` | 10 |  |
| `src/components/field-management/new-group-dialog.test.tsx` | 9 |  |
| `src/components/field-management/page-search.test.tsx` | 8 |  |
| `src/components/field-management/sortable-field-item.test.tsx` | 22 |  |
| `src/components/field-management/sortable-group.test.tsx` | 13 |  |
| `src/components/field-management/use-field-order-state.test.ts` | 33 |  |

## `src/components/group-wizard` (12 files, 159 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/components/group-wizard/actions.test.ts` | 32 |  |
| `src/components/group-wizard/contact-search.test.tsx` | 11 |  |
| `src/components/group-wizard/group-search.test.tsx` | 13 |  |
| `src/components/group-wizard/schema.test.ts` | 22 |  |
| `src/components/group-wizard/step-attributes.test.tsx` | 11 |  |
| `src/components/group-wizard/step-identity.test.tsx` | 13 |  |
| `src/components/group-wizard/step-meeting.test.tsx` | 11 |  |
| `src/components/group-wizard/step-organization.test.tsx` | 9 |  |
| `src/components/group-wizard/step-review.test.tsx` | 9 |  |
| `src/components/group-wizard/step-settings.test.tsx` | 10 |  |
| `src/components/group-wizard/wizard-navigation.test.tsx` | 11 |  |
| `src/components/group-wizard/wizard-stepper.test.tsx` | 7 |  |

## `src/components/{layout,shared-actions,tool}` (5 files, 44 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/components/layout/auth-wrapper.test.tsx` | 6 | `AuthWrapper` redirect to `/signin` (callbackUrl) or `/session-error`; renders children when authenticated |
| `src/components/shared-actions/domain.test.ts` | 6 | `getMpTimezone`: refuses without a session, delegates to `DomainTimezoneService` |
| `src/components/shared-actions/sign-out.test.ts` | 13 | `handleSignOut`: session cleared first, MP-origin-only `id_token_hint`, end-session URL shape, env guards |
| `src/components/shared-actions/user.test.ts` | 6 | `getCurrentUserProfile` session-derived GUID lookup, `Unauthorized` on missing/empty `userGuid`, IDOR regression (caller-forged argument ignored), error propagation |
| `src/components/tool/tool-framework.test.tsx` | 13 | `ToolContainer` / `ToolHeader` / `ToolFooter` optional-prop branches |

## `src/contexts` (2 files, 16 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/contexts/use-app-session.test.ts` | 2 | `useAppSession` hook wrapper |
| `src/contexts/user-context.test.tsx` | 14 | `UserProvider` lifecycle, profile loading, errors, edge branches |

## `src/lib/providers/ministry-platform` (16 files, 521 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/lib/providers/ministry-platform/auth/client-credentials.test.ts` | 29 | OAuth2 `client_credentials` token flow |
| `src/lib/providers/ministry-platform/client.test.ts` | 36 | OAuth token lifecycle, refresh, concurrent calls (uses `vi.useFakeTimers`) |
| `src/lib/providers/ministry-platform/helper.test.ts` | 67 | MPHelper CRUD, Zod validation, procedures, files, copy/recurrence/generateSequence |
| `src/lib/providers/ministry-platform/provider.test.ts` | 29 | Singleton, service delegation, generateSequence with optional fields |
| `src/lib/providers/ministry-platform/scripts/codegen-escape.test.ts` | 25 | Codegen escaping: `commentText`, `propertyKey`, `positiveInt` |
| `src/lib/providers/ministry-platform/services/communication.service.test.ts` | 12 | Communications and messages with/without attachments |
| `src/lib/providers/ministry-platform/services/domain.service.test.ts` | 8 | Domain info, global filters |
| `src/lib/providers/ministry-platform/services/file.service.test.ts` | 39 | File CRUD, FormData building, unauthenticated blob retrieval |
| `src/lib/providers/ministry-platform/services/guards.test.ts` | 53 | `sanitizeIdentifier` / `sanitizeRecordId` / `sanitizeUniqueId` / `tableEndpoint` / `errorName` |
| `src/lib/providers/ministry-platform/services/metadata.service.test.ts` | 7 | Metadata refresh, tables search |
| `src/lib/providers/ministry-platform/services/procedure.service.test.ts` | 19 | Procedure listing + query/body execution with URL encoding |
| `src/lib/providers/ministry-platform/services/table.service.test.ts` | 49 | CRUD + `copyRecord` + `copyRecordWithSubpages` |
| `src/lib/providers/ministry-platform/utils/http-client.test.ts` | 104 | HTTP methods, URL building, FormData, error handling |
| `src/lib/providers/ministry-platform/utils/logger.test.ts` | 4 | Debug vs production gating, error always logs |
| `src/lib/providers/ministry-platform/scripts/generate-storedprocs.test.ts` | 4 |  |
| `src/lib/providers/ministry-platform/scripts/generate-types.test.ts` | 36 |  |

## `src/lib/**` (excl. MP provider) (14 files, 255 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/lib/auth-client.test.ts` | 4 |  |
| `src/lib/barcode-helpers.test.ts` | 14 | Barcode generation utilities |
| `src/lib/barcode-image.test.ts` | 6 | BMP rendering for IMb/POSTNET with JSON fallback |
| `src/lib/dto/address-label.dto.test.ts` | 5 |  |
| `src/lib/dto/family.test.ts` | 9 |  |
| `src/lib/env.test.ts` | 45 | `getMpBaseUrl` / `getAuthBaseUrl` / `getMpClient` validation |
| `src/lib/imb-encoder.test.ts` | 10 | USPS Intelligent Mail barcode encoding |
| `src/lib/label-stock.test.ts` | 9 | Label stock definitions and calculations |
| `src/lib/postnet-encoder.test.ts` | 9 | POSTNET barcode encoding |
| `src/lib/providers/google-places/provider.test.ts` | 11 |  |
| `src/lib/security-headers.test.ts` | 28 | `buildCsp`, `generateNonce`, CSP report URI / `Reporting-Endpoints` header |
| `src/lib/tool-params.test.ts` | 28 | `parseToolParams` (from `tool-params.server.ts`: input shapes, NaN guard, decoding, `pageData`), `isNewRecord`, `isEditMode` |
| `src/lib/validation.test.ts` | 60 | GUID / positive int / column name / filter escaping |
| `src/lib/zip-guard.test.ts` | 17 | `assertZipWithinLimits` / `ZipLimitError` |

## `src/services` (9 files, 245 cases)

| Test File | Cases | What It Covers |
|---|---|---|
| `src/services/addressLabelService.test.ts` | 9 | Address fetching, batching, single contact |
| `src/services/authorizationService.test.ts` | 32 | `requireSecurityRole` / `hasSecurityRole`, `resolveRolePolicy`, `MP_SECURITY_ROLES` fails closed |
| `src/services/domainTimezoneService.test.ts` | 22 | `resolveIanaTimezone`, `getMpTimezone`, `toMpSqlDatetime`, `parseMpDatetime` |
| `src/services/familyService.test.ts` | 56 |  |
| `src/services/fieldManagementService.test.ts` | 21 | Pages, fields, table metadata, batched order updates |
| `src/services/googlePlacesService.test.ts` | 18 |  |
| `src/services/groupService.test.ts` | 27 | Group CRUD, lookups, contact/group search |
| `src/services/toolService.test.ts` | 53 | Page data, user tools, selection records, contact resolution, `listPages`, `listRoles`, `deployTool` |
| `src/services/userService.test.ts` | 7 | `getUserProfile`: display fields only, single query, GUID validation, not-found, error propagation |

## Known uncovered surfaces
- `src/lib/providers/ministry-platform/scripts/` CLI build scripts (`build-sql-install.ts`, `generate-types.ts`, `generate-storedprocs.ts`) — excluded from coverage; exercised via `npm run mp:build:install` / `npm run mp:generate:models`. Only the escaping helpers have a unit test (`codegen-escape.test.ts`).
- Auto-generated model files under `src/lib/providers/ministry-platform/models/` — excluded from coverage via `vitest.config.mts`
- `src/components/ui/**` (vendored shadcn primitives) — excluded from coverage

## Related docs
- `setup.md` — runner config
- `cookbook.md` — starting points per flavor
- `mocks.md` — required mock patterns

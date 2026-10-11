---
title: Error catalog
domain: data-flow
type: reference
applies_to: [src/proxy.ts, src/lib/auth.ts, src/lib/providers/ministry-platform/**, src/services/**, src/components/**/actions.ts, src/lib/validation.ts]
symbols: [Error, UnauthorizedError, MPValidationError, PartialSaveError, ZipLimitError]
related: [call-graphs.md, ../auth/README.md, ../mp-provider/error-handling.md, ../security/README.md]
last_verified: 2026-10-10
---

## Purpose
Every error thrown in `src/**` categorized by origin layer. Useful for debugging a stack trace, designing a new error flow, or deciding where to insert a try/catch.

All server-side logs and thrown messages follow CLAUDE.md rule 14: **identifiers and shape only** — never record content, `$filter` strings, request or response bodies.

## By layer

### OAuth / session

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `getUserInfo` refusal → returns `null` (never throws) — missing/invalid id_token, claim failure, userinfo non-OK / non-JSON / network error, no usable `sub`, `sub` mismatch | `src/lib/auth.ts:778-870` | Better Auth callback treats `null` as failure; `onAPIError.errorURL` (`src/lib/auth.ts:1053-1055`) | redirect to `/auth-error?error=...` (public path), no session | yes — one JSON line on `console.error` via `logAuthEvent` (e.g. `auth.userinfo.fetch_failed` with `reason`/`status`, `auth.userinfo.invalid_sub`) |
| `src/lib/env.ts` reader throws (`getMpBaseUrl` / `getAuthBaseUrl` / `getMpClient`) — unset/malformed value, never echoed | `src/lib/env.ts` (e.g. from `handleSignOut` in `src/components/shared-actions/sign-out.ts`) | propagates (uncaught) | server-action error surfaces to caller | no |
| `authClient.getSession()` rejection on /signin | `src/app/signin/sign-in-content.tsx:229` (promise) | same file, `.catch` at line 240 | falls through to `startOAuth()` → `signIn.social` | yes, `console.error("SignIn: Failed to check session:", err)` |
| `signIn.social` throw / rejection | `src/app/signin/sign-in-content.tsx:179` | same file, lines 185-205 | inline "Failed to start sign-in" + retry button | yes, `console.error("SignIn: authClient.signIn.social ...")` |
| Proxy `getSessionCookie` throw (cookie parse error) | `src/proxy.ts:91` | `src/proxy.ts:99-105` | redirect to `/signin?callbackUrl=...` | yes, `console.error('proxy.session_check_failed', { message })` |
| No session cookie (control-flow, not throw) | `src/proxy.ts:93` check | `src/proxy.ts:94` `redirectToSignin()` | redirect to `/signin?callbackUrl=...` | no |
| No session at `AuthWrapper` (control-flow) | `src/components/layout/auth-wrapper.tsx:9` check | `src/components/layout/auth-wrapper.tsx:16` `redirect()` | redirect to `/signin?callbackUrl=...` via Next `redirect()` (throws `NEXT_REDIRECT`) | no |
| Session without `userGuid` (control-flow) | `src/components/layout/auth-wrapper.tsx:25-26` | `redirect("/session-error")` (line 27) | recovery page with a sign-out form | no |
| `Error('Failed to get client credentials token: <status> <statusText>')` / `': <error name>'` / `': invalid token response'` | `src/lib/providers/ministry-platform/auth/client-credentials.ts:59,64,82` | `src/lib/providers/ministry-platform/client.ts:59-64` sets a negative-cache window, logs, re-throws | server-side 500; tool pages fail to render | yes, `logger.error("mp.token.refresh_failed", { profile, error: <name> })` |
| `Error('MP access token unavailable: recent refresh failed')` | `src/lib/providers/ministry-platform/client.ts:42` — within the negative-cache window after a failed refresh | propagates | as above | no (the original failure was logged) |
| `Error('Dev client credentials are not configured…')` | `src/lib/providers/ministry-platform/auth/client-credentials.ts:93-95` | `client.ts` refresh path logs + re-throws; surfaced in deploy-tool UI | Deploy Tool panel shows the error | yes, `mp.token.refresh_failed` with `profile: 'dev'` |

### MP API (HTTP client)

All MP REST errors originate in `HttpClient.request` / `HttpClient.send` (`src/lib/providers/ministry-platform/utils/http-client.ts`). Endpoints in messages are **redacted** (`redactEndpoint` — path only, GUIDs replaced); bodies and query strings never appear. Provider services (`table.service`, `procedure.service`, `file.service`, …) log `mp.<area>.<op>_failed` with the error **name** and re-throw unmodified.

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `${METHOD} ${endpoint} failed: ${status} ${statusText}` (any method, JSON or FormData) | `http-client.ts:226` | provider service catch (e.g. `services/table.service.ts:28-30`, `services/procedure.service.ts:48-50,76-78`) logs + re-throws; bubbles to app service → action | action throws or returns `{ success: false, error }` | yes, `mp.request.failed` `{ method, endpoint, status, statusText }` + `mp.<area>.<op>_failed` |
| `${METHOD} ${endpoint} failed: ${errorName}` — network error, timeout (`AbortSignal.timeout`), or refused redirect (`redirect: 'error'`) | `http-client.ts:264` | as above | as above | yes, `mp.request.failed` `{ method, endpoint, error }` |
| `${METHOD} ${endpoint} failed: unexpected content-type` / `: invalid JSON response` | `http-client.ts:52,58` (`readJsonResponse`) | as above | as above | provider service log only |
| Unsafe endpoint (`..`, encoded separators, etc.) / `Error('Invalid MP API base URL')` | `http-client.ts:161,170,174` (`assertSafeEndpoint`) | as above | as above | provider service log only |
| 401 → one token refresh + retry; refresh failure falls through to the normal status error | `http-client.ts:202-216` | — | — | yes, `mp.token.refresh_after_401_failed` |
| `GET /files/{uniqueId} failed: ${status} ${statusText}` (unauthenticated file content) | `services/file.service.ts:213` | `file.service.ts:217-219` logs + re-throws | as above | yes, `mp.files.get_content_failed` |
| `Error('Invalid record IDs')` (delete) | `services/table.service.ts:138` | `table.service.ts:147-149` | as above | yes, `mp.table.delete_failed` |
| Empty/missing result set (not a throw) from stored procs | n/a | `src/services/toolService.ts:139-144,175-184,206-211`; `src/services/fieldManagementService.ts:52-56,68-72` length checks | returns `null` or `[]` — silently treated as "no data" | no |

**HTTP status → source note.** Message carries only `status`/`statusText`. 400 / 403 / 404 / 409 / 413 / 500 (e.g., "Ambiguous column name") all surface through the same template — the layer does **not** branch on status (except the 401 retry). The MP response body is never included, so diagnose a 500 from MP's own logs, not the app's.

### Authorization

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `UnauthorizedError('Not authorized')` (`code: "UNAUTHORIZED"`) — no session, no `userGuid`, no `dp_Users` row, `MP_SECURITY_ROLES` unconfigured, or no matching role | `src/services/authorizationService.ts:224` (`requireSecurityRole`) — the gate every feature action and MP-touching service method calls | tool pages: `requireToolAccess` → `redirect("/no-access")`; actions: component `try/catch` or `{ success: false, error }` envelope | `/no-access` page, or inline error | yes — `console.warn('mp.read.unauthorized' \| 'mp.write.unauthorized', { table, operation, reason, userId })`, plus `mp.write.non_user` when no MP user was resolved |
| MP failure while resolving `User_ID` / roles | `src/services/authorizationService.ts:162` (re-throw) | **never** converted to "not authorized"; propagates to error boundary / action catch | error page or inline error | MP-layer logs only |
| `hasSecurityRole()` — never throws; returns `false` on any error | `src/services/authorizationService.ts:235-244` | `src/app/(web)/tools/layout.tsx:31` → `redirect("/no-access")` | `/no-access` | no |
| `Error('Unauthorized')` | `src/components/shared-actions/user.ts:28` — session has no non-empty `userGuid` | `src/contexts/user-context.tsx:43-45` try/catch → `error` state | silent (consumers of `useUser()` inspect `error`) | no |
| `Error('Unauthorized - Missing user session data')` | `src/components/dev-panel/panels/require-dev-session.ts:34` — single guard shared by every dev-panel action | component catch → `setError` | inline | no |
| ``Error(`${featureLabel} is not available in production.`)`` | `src/components/dev-panel/panels/require-dev-session.ts:30` (`featureLabel` defaults to `"Dev panel"`; deploy-tool passes `"Deploy Tool"`) | dev-panel / deploy-tool panel catch → `setError` | "production" warning to user | no |

### Validation

Validator messages name the field, never the value (`src/lib/validation.ts` header).

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `MPValidationError` — `'Validation failed for record ${i}: ${zod message}'`, keeps `recordIndex` + `zodError` (create) | `src/lib/providers/ministry-platform/helper.ts:217` (class at `:33-41`) | re-thrown out of `createTableRecords` | server action bubbles to component | no |
| `MPValidationError` (update; `partial` → `schema.partial()`) | `src/lib/providers/ministry-platform/helper.ts:305` | re-thrown out of `updateTableRecords` | as above | no |
| `Error('Invalid GUID format')` | `src/lib/validation.ts:22` (`validateGuid`) | caller propagates | inline error | no |
| `Error('Expected positive integer')` / `'Expected positive integer for ${field}'` | `src/lib/validation.ts:35` (`validatePositiveInt`) | caller propagates / action envelope | inline error | no |
| `Error('Invalid column name')` | `src/lib/validation.ts:42` (`validateColumnName`) | `ToolService.resolveContactIds` / `FamilyService.resolveContactIdFromPage` → action | inline error | no |
| `Error('Invalid ${field}')` (e.g. `Invalid Contact_ID_Field`) | `src/lib/validation.ts:66,75` (`validateFkPath`); `src/services/familyService.ts:171` | as above | inline error | no |
| `Error('Invalid search value: ...')` — non-string, > 100 chars, control characters | `src/lib/validation.ts:129-137` (`escapeFilterString`) | search action → component | search shows error / no results | no |
| `'Mailer ID must be exactly 6 or 9 digits, got: N'` | `src/lib/validation.ts:87` (`validateMailerId`) | `prepareLabels` → envelope | inline | no |
| `'Invalid group data: <field paths>'` (envelope, not throw) | `parseGroupPayload` in `src/components/group-wizard/actions.ts` (`groupWizardSchema.safeParse`) | `createGroup` / `updateGroup` actions | inline | no |
| `'Invalid family data. Check these fields: <paths>'` (envelope) | `saveFamily` in `src/app/(web)/tools/addeditfamily/actions.ts` (`HouseholdSchema.safeParse`) | same action | inline | no |
| Zod `ZodError` via `zodResolver` (group wizard) | `src/components/group-wizard/schema.ts` (`groupWizardSchema`) | RHF `form.trigger(...)` in `src/app/(web)/tools/groupwizard/group-wizard.tsx:123` | in-form field error messages | no |
| `Error('Input must contain only digits')` (IMb) | `src/lib/imb-encoder.ts:323` | `src/lib/barcode-helpers.ts:60` catch — falls through to POSTNET | no user-facing error; label prints without IMb | yes, `console.warn('[preEncodeBarcodes] IMb encode failed, ...', { labelIndex, error: <name> })` |
| `Error('Input must be 20, 25, 29, or 31 digits (got N)')` | `src/lib/imb-encoder.ts:328` | `src/lib/barcode-helpers.ts:60` | as above | as above |
| `Error('Invalid routing code length: N')` | `src/lib/imb-encoder.ts:249` | `src/lib/barcode-helpers.ts:60` | as above | as above |
| `Error('Codeword out of range: N')` | `src/lib/imb-encoder.ts:364` | `src/lib/barcode-helpers.ts:60` | as above | as above |
| `Error('POSTNET input must contain only digits')` | `src/lib/postnet-encoder.ts:35` | `src/lib/barcode-helpers.ts:71` catch → retry with 5-digit substring, then final catch at `:79` | label prints without barcode | yes, `console.warn` per fallback step |
| `Error('POSTNET input must be 5, 9, or 11 digits (got N)')` | `src/lib/postnet-encoder.ts:39` | `src/lib/barcode-helpers.ts:71,79` | as above | as above |

### Service

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `Error('Tool Name is required')` | `src/services/toolService.ts:277` (`deployTool` guard) | deploy-tool UI catch → `setError` | inline error | no |
| `Error('Launch Page is required')` | `src/services/toolService.ts:278` | deploy-tool UI | inline | no |
| `Error('Tool Name must be 30 characters or fewer')` | `src/services/toolService.ts:279` | deploy-tool UI | inline | no |
| `Error('Description must be 100 characters or fewer')` | `src/services/toolService.ts:280` | deploy-tool UI | inline | no |
| `Error('Launch Page must be 1024 characters or fewer')` | `src/services/toolService.ts:281` | deploy-tool UI | inline | no |
| `Error('Additional Data must be 65 characters or fewer')` | `src/services/toolService.ts:282` | deploy-tool UI | inline | no |
| `Error('Deploy did not return a tool row — check stored procedure permissions and dev credentials.')` | `src/services/toolService.ts:302` | `src/components/dev-panel/panels/deploy-tool-actions.ts` → panel catch | inline error | no |
| `PartialSaveError(progress, underlying)` — any failure mid-`saveHousehold` | `src/services/familyService.ts:24-29` (wrapped by `wrap()` in `saveHousehold`) | `saveFamily` action → `{ success: false, error, progress }` | inline error; client keeps IDs already created | MP-layer logs only |
| `Error('Could not find an available envelope number after 5 attempts ...')` | `src/services/familyService.ts:749` (`resolveUniqueEnvelopeNo`) | wrapped as `PartialSaveError` → `saveFamily` envelope | inline | no |
| `Error('Google Places API key is not configured. ...')` | `src/services/googlePlacesService.ts:86` | `placeDetails` action envelope; `placeAutocomplete` short-circuits on `isEnabled()` | inline | no |
| `Error('toMpSqlDatetime: value must be a non-empty string or Date')` / `'... could not be parsed as a date'` | `src/services/domainTimezoneService.ts:286,297` | write path (`GroupService`, `FamilyService`) → action envelope | inline | no |
| `Error('parseMpDatetime: value could not be parsed as a date')` | `src/services/domainTimezoneService.ts:314` | caller | inline | no |
| Procedure failure from `api_MPNextTools_UpdatePageFieldOrder` (propagates from http-client) | `http-client.ts:226`, via `src/services/fieldManagementService.ts:115-132` | `src/components/field-management/actions.ts:99-100` → `{ success: false, error }` | inline error | yes (http-client + procedure service) |

### Client-fetch (actions returning `{success, error}` envelope)

These do NOT throw to the component; server action returns `{ success: false, error }`. The component inspects that shape and calls `setError`.

| Type | Thrown at (internal) | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `'Too many labels (N); the limit is 10,000 per request'` / `'Invalid label data'` / `'Invalid label settings'` | `parseLabelInput` in `src/components/address-labels/schemas.ts` (Zod `safeParse`; count cap = `MAX_LABELS` in `limits.ts`), called from `prepareLabels` in `actions.ts` | `generateLabelPdf` / `generateLabelDocx` / `mergeTemplate` return the envelope | tab components `setError` | no (errors name the problem, never the payload) |
| `Unknown label stock: ${id}` (control-flow branch, not throw) | `prepareLabels` in `src/components/address-labels/actions.ts` | all three render actions return `{success:false}` | mail-merge / PDF tab `setError` | no |
| `'Start position is beyond the end of the sheet'` | `prepareLabels` — `config.startPosition > stock.columns * stock.rows` | all three render actions | inline | no |
| `'No labels to print' / 'No labels to export' / 'No addresses to merge'` | `prepareLabels` (`emptyMessage` arg, per action) | tab components `setError` | inline | no |
| Mailer ID validation message (`validateMailerId`) / fallback `'Invalid Mailer ID'` | `prepareLabels`, when `barcodeFormat === 'imb' && mailerId` | all three render actions | inline | no |
| `'Template file exceeds 2MB limit'` (`MAX_TEMPLATE_LABEL`) | `mergeTemplate` in `src/components/address-labels/actions.ts` — base64 length × 0.75 > `MAX_TEMPLATE_BYTES`, checked before decoding or `prepareLabels` | `mail-merge-tab.tsx` `handleMerge` → `setError(result.error)` | inline | no |
| `'Template file must be under 2MB'` (client pre-check) | `src/components/address-labels/mail-merge-tab.tsx` `handleFileChange`, `file.size > MAX_TEMPLATE_BYTES` | same function → `setError` early return | inline | no |
| `ZipLimitError`: `'Not a valid .docx file'` / `'ZIP64 templates are not supported'` / `'Template contains too many files'` / `'Encrypted templates are not supported'` / `'Template uses an unsupported compression method'` / `'Template is too large when uncompressed'` | `assertZipWithinLimits` in `src/lib/zip-guard.ts` (limits = `TEMPLATE_ZIP_LIMITS`), run by `mergeTemplate` before PizZip | `mergeTemplate` try/catch → envelope with `error.message`; any non-`ZipLimitError` → `'Not a valid .docx file'` | inline | no |
| Server-action body over `4mb` | Next.js (`experimental.serverActions.bodySizeLimit` in `next.config.ts`) rejects the request before the action body runs | client `await` rejects → `mail-merge-tab.tsx` `handleMerge` catch → `setError(err.message)` (fallback `'Merge failed'`) | inline | framework-side only |
| PDF render failure (`@react-pdf/renderer` `toBlob`) | throws inside try in `generateLabelPdf` (`src/components/address-labels/actions.ts`) | same function wraps as `{success:false, error: message}` | inline error | yes, `console.error('generateLabelPdf error:', describeError(error))` |
| Docx render failure (`Packer.toBuffer`) | throws inside try in `generateLabelDocx` | same function wraps as envelope | inline error | yes, `console.error('generateLabelDocx error:', describeError(error))` |
| Docxtemplater render error (tag mismatch) | throws inside `doc.render` in `mergeTemplate` | same function wraps; if message includes `'tag'` returns `Template error: ... Check that merge tokens are correctly formatted.` | inline error | yes, `console.error('mergeTemplate error:', describeError(error))` |
| Profile fetch failure in `UserProvider` | `src/components/shared-actions/user.ts:28` (`Unauthorized` — session has no `userGuid`) or downstream MP error from `UserService.getUserProfile` | `src/contexts/user-context.tsx:43-45` try/catch sets `error` state | silent (consumers of `useUser()` inspect `error`) | no |
| `Error("useUser must be used within a UserProvider")` | `src/contexts/user-context.tsx:80` | uncaught — surfaces to nearest React error boundary | error boundary UI | no |
| `Error("useFormField should be used within <FormField>")` | `src/components/ui/form.tsx:53` | uncaught — React error boundary | same as above | no |
| "IMb requires a 6 or 9 digit USPS Mailer ID" (control-flow) | `src/components/address-labels/mail-merge-tab.tsx:112` | same function → `setError` early return | inline error | no |

## Error-handling patterns

### Server action failures
Two shapes exist; actions are inconsistent.
- **Throw-then-catch:** action throws (including `UnauthorizedError` from `requireAccess()`); calling component wraps call in `try/catch` and calls `setError(err instanceof Error ? err.message : 'fallback')`. Examples: `selection-actions.ts`, `user-tools-actions.ts`, `contact-records-actions.ts`, `fetchAddressLabels`, `field-management/actions.ts` (`fetchPages`, `fetchPageFieldData`), `group-wizard/actions.ts` (`fetchGroupWizardLookups`, `searchContacts`, `searchGroups`).
- **Envelope shape (`ActionError`):** action returns `{ success: false, error: string }`. Used by `address-labels/actions.ts` (PDF/docx/merge), `group-wizard/actions.ts` (`fetchGroupRecord`, `createGroup`, `updateGroup`), `field-management/actions.ts` (`savePageFieldOrder`), `addeditfamily/actions.ts` (`fetchHousehold`, `resolveContactIdFromPage`, `placeDetails`, `saveFamily` — the last adds `progress`).
- **Mixed in same file** is common — no central policy; see `address-labels/actions.ts` for both shapes in one file.

### HTTP error shape (MP API)
All errors from `http-client.ts` follow `${METHOD} ${redactedEndpoint} failed: ${status} ${statusText}` (or `: ${errorName}` for transport failures). No body is ever included — for any method or content type.

### Zod validation errors (helper.ts)
`MPHelper.createTableRecords` and `MPHelper.updateTableRecords` re-wrap a `ZodError` from `schema.parse` as `MPValidationError` (`src/lib/providers/ministry-platform/helper.ts:33-41`), which subclasses `Error` and keeps `recordIndex` and the original `zodError` — callers can check `instanceof MPValidationError` for field-level issues. Non-Zod throws are wrapped in a plain `Error` with the same message prefix.

### Silent / quiet fallbacks (deliberate)
- **Barcode encoding cascade.** `src/lib/barcode-helpers.ts:60,71,79` — on IMb failure, fall through to POSTNET; on POSTNET failure, retry with first 5 digits; on second failure, return the label with no barcode. Each step logs a `console.warn` with the label index and error name only. Test coverage: `src/lib/barcode-helpers.test.ts`.
- **`ToolService.getPageData` / `getUserTools` / `getSelectionRecordIds` length checks** — when the stored procedure returns empty/missing result sets, the services return `null` / `[]` rather than throwing. Callers must differentiate "no data" from "error" by checking the return value.
- **`parseToolParams`** (`src/lib/tool-params.server.ts`) — a `getPageData` failure is swallowed to `pageData = undefined` with `console.warn('tool_params.page_data_unavailable', { pageID })`; bad integers become `undefined`, a malformed `recordDescription` escape falls back to the raw value.
- **`GooglePlacesService.resolveApiKey`** — an MP lookup failure is swallowed and falls through to `GOOGLE_PLACES_API_KEY`. The `dp_Configuration_Settings`/`read` gate runs before this, outside the try/catch, so an `UnauthorizedError` is never swallowed.

### Uncaught errors → React error boundary
- Boundaries: `src/app/(web)/error.tsx` (inside the app shell), `src/app/error.tsx`, `src/app/global-error.tsx` (root layout failures).
- `useUser` outside `UserProvider` — `src/contexts/user-context.tsx:80`.
- `useFormField` outside `<FormField>` — `src/components/ui/form.tsx:53`.

### Unlogged failures
Validation errors (`src/lib/validation.ts`), session errors (`'Unauthorized'`, `'Unauthorized - Missing user session data'`), and envelope-shaped action errors (`{success:false, error}`) are NOT logged server-side. Authorization denials **are** logged (`mp.read.unauthorized` / `mp.write.unauthorized`), as are HTTP-level failures (`mp.request.failed`).

## Related docs
- [call-graphs.md](call-graphs.md) — error paths in the context of full request flows
- [../mp-provider/error-handling.md](../mp-provider/error-handling.md) — MP provider-specific error flow
- [../security/README.md](../security/README.md) — authorization gate and denial logging
- [../GOTCHAS.md](../GOTCHAS.md) — symptom-first index of known traps
- [../auth/README.md](../auth/README.md) — session/OAuth error surface

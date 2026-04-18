---
title: Error catalog
domain: data-flow
type: reference
applies_to: [src/proxy.ts, src/lib/auth.ts, src/lib/providers/ministry-platform/**, src/services/**, src/components/**/actions.ts, src/lib/validation.ts]
symbols: [Error]
related: [call-graphs.md, ../auth/README.md, ../mp-provider/error-handling.md]
last_verified: 2026-04-17
---

## Purpose
Every error thrown in `src/**` categorized by origin layer. Useful for debugging a stack trace, designing a new error flow, or deciding where to insert a try/catch.

## By layer

### OAuth / session

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `getUserInfo` userinfo fetch non-OK → returns `null` (no throw) | `src/lib/auth.ts:59-65` | Better Auth internals abort user creation on `null` | sign-in silently fails, OAuth loop repeats | yes, `console.error("getUserInfo - Failed to fetch user info:", status)` |
| `Error('MINISTRY_PLATFORM_BASE_URL is not configured')` | `src/components/user-menu/actions.ts:15` | propagates (uncaught) | server-action error surfaces to caller | no |
| `authClient.getSession()` rejection on /signin | `src/app/signin/page.tsx:16` (promise) | `src/app/signin/page.tsx:30-40` | falls through to `signIn.oauth2()` redirect | yes, `console.error("Failed to check session:", err)` |
| Proxy `getSessionCookie` throw (cookie parse error) | `src/proxy.ts:24` | `src/proxy.ts:36-41` | redirect to `/signin?callbackUrl=...` | yes, `console.error('Proxy: Error checking session:', error)` |
| No session cookie (control-flow, not throw) | `src/proxy.ts:26` check | `src/proxy.ts:26-31` | redirect to `/signin?callbackUrl=...` | yes, `console.log("Proxy: Redirecting to signin - no session cookie")` |
| No session at `AuthWrapper` (control-flow) | `src/components/layout/auth-wrapper.tsx:9` check | `src/components/layout/auth-wrapper.tsx:16` `redirect()` | redirect to `/signin?callbackUrl=...` via Next `redirect()` (throws `NEXT_REDIRECT`) | no |
| `Error('Failed to get client credentials token: ${statusText}')` | `src/lib/providers/ministry-platform/auth/client-credentials.ts:25` | `src/lib/providers/ministry-platform/client.ts:63` logs, re-throws | server-side 500; tool pages fail to render | yes, `logger.error("Failed to refresh token:", error)` |
| `Error('Dev client credentials are not configured…')` | `src/lib/providers/ministry-platform/auth/client-credentials.ts:36-38` | `src/lib/providers/ministry-platform/client.ts:89` re-throws; ultimately surfaced in deploy-tool UI | Deploy Tool panel surfaces error to user via `setError` | yes, `logger.error("Failed to refresh dev token:", error)` |
| `fetch` network `TypeError` (token POST) | `src/lib/providers/ministry-platform/auth/client-credentials.ts:16` | `src/lib/providers/ministry-platform/client.ts:63,89` logs, re-throws | same as above | yes |

### MP API (HTTP client)

All MP REST errors originate in `src/lib/providers/ministry-platform/utils/http-client.ts` as `Error` with message shape `${METHOD} ${endpoint} failed: ${status} ${statusText}[ - ${body}]`. They propagate back to the service that called them (`table.service`, `procedure.service`, `file.service`, etc.), which `logger.error`-logs and re-throws unmodified via `throw error`.

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `GET ${endpoint} failed: ${status} ${statusText} - ${body}` | `src/lib/providers/ministry-platform/utils/http-client.ts:32` | service catch (e.g., `table.service.ts:29`) logs + re-throws; bubbles to action | server action throws → component catch sets error state | yes, `logger.error("GET Request failed:", {status, statusText, url, responseBody})` |
| `POST ${endpoint} failed: ${status} ${statusText} - ${body}` (JSON) | `src/lib/providers/ministry-platform/utils/http-client.ts:59` | service catch (e.g., `table.service.ts:49`, `procedure.service.ts:78`) re-throws | as above | yes |
| `POST ${endpoint} failed: ${status} ${statusText}` (FormData; **no body** included) | `src/lib/providers/ministry-platform/utils/http-client.ts:79` | `file.service.ts:80` re-throws | upload error surfaces to component | no — FormData path does NOT log the response body (gotcha) |
| `PUT ${endpoint} failed: ${status} ${statusText}` (JSON) | `src/lib/providers/ministry-platform/utils/http-client.ts:112` | `table.service.ts:68`, `file.service.ts:129` re-throw | as above | yes, `logger.error("PUT Request failed:", {...})` |
| `PUT ${endpoint} failed: ${status} ${statusText}` (FormData; no body logging) | `src/lib/providers/ministry-platform/utils/http-client.ts:132` | `file.service.ts:129` re-throws | as above | no body logged |
| `DELETE ${endpoint} failed: ${status} ${statusText}` | `src/lib/providers/ministry-platform/utils/http-client.ts:150` | `table.service.ts:148`, `file.service.ts:151` re-throw | as above | no body logged |
| `GET /files/${uniqueId} failed: ${status} ${statusText}` (unauthenticated file content) | `src/lib/providers/ministry-platform/services/file.service.ts:177` | `file.service.ts:183` logs + re-throws | as above | yes, `logger.error("Error getting file content by unique ID:", error)` |
| Empty/missing result set (not a throw) from stored procs | n/a | `src/services/toolService.ts:132-137,161-170,189-194`; `src/services/fieldManagementService.ts:46-50,58-62` length checks | returns `null` or `[]` — silently treated as "no data" | no |

**HTTP status → source note.** Message carries only `status`/`statusText` verbatim from the fetch response. 400 / 403 / 404 / 409 / 413 / 500 (e.g., "Ambiguous column name") all surface through the same string template — the layer does **not** branch on status code. Callers must pattern-match on the message if they need to differentiate.

### Validation

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `Error('Validation failed for record ${i}: ${zod message}')` (create) | `src/lib/providers/ministry-platform/helper.ts:189` | `helper.ts:209-212` re-throws via wrapper | server action bubbles to component | no (helper strips Zod `.issues` — only the `message` survives; structured errors lost — gotcha) |
| `Error('Validation failed for record ${i}: ${zod message}')` (update) | `src/lib/providers/ministry-platform/helper.ts:273` | `helper.ts:291-293` re-throws | as above | no — same Zod `.issues` stripping |
| `Error('Invalid GUID format: ${value}')` | `src/lib/validation.ts:6` (`validateGuid`) | server-action catch (e.g., `userService` caller) | component catches → `setError` | no |
| `Error('Expected positive integer, got: ${value}')` | `src/lib/validation.ts:13` (`validatePositiveInt`) | service callsite try/catch propagates to action | component catches → `setError` | no |
| `Error('Invalid column name: ${value}')` | `src/lib/validation.ts:20` (`validateColumnName`) | `toolService.resolveContactIds` callsite → action | component catches → `setError` | no |
| `Error('Unauthorized')` | `src/components/address-labels/actions.ts:30`, `src/components/dev-panel/panels/selection-actions.ts:18`, `src/components/dev-panel/panels/contact-records-actions.ts:15`, `src/components/dev-panel/panels/user-tools-actions.ts:12`, `src/components/field-management/actions.ts:10`, `src/components/group-wizard/actions.ts:19`, `src/components/shared-actions/user.ts:10`, `src/components/template-editor/actions.ts:9` | component `try/catch` → `setError` (or `ActionError` shape for group-wizard) | toast / inline error | no |
| `Error('Unauthorized - Missing user session data')` (deploy-tool, user-tools variants) | `src/components/dev-panel/panels/deploy-tool-actions.ts:19`, `src/components/dev-panel/panels/user-tools-actions.ts:12` | component catch → `setError` | as above | no |
| `Error('User GUID not found in session')` | `src/components/address-labels/actions.ts:36`, `src/components/dev-panel/panels/selection-actions.ts:21`, `src/components/dev-panel/panels/user-tools-actions.ts:17`, `src/components/group-wizard/actions.ts:25` | component catch → `setError` | toast / inline | no |
| `Error('Deploy Tool is not available in production.')` | `src/components/dev-panel/panels/deploy-tool-actions.ts:15` | deploy-tool panel catch → `setError` | "production" warning to user | no |
| `Error('MJML source must be between 1 and 512000 characters')` | `src/components/template-editor/actions.ts:19` | editor dialogs (`editor-code-dialog.tsx`, `editor-export-dialog.tsx`) catch | inline error state | no |
| Zod `ZodError` via `zodResolver` (group wizard) | `src/components/group-wizard/schema.ts` (`groupWizardSchema`) | RHF `form.trigger(...)` in `src/app/(web)/tools/groupwizard/group-wizard.tsx:104` | in-form field error messages | no |
| `Error('Input must contain only digits')` (IMb) | `src/lib/imb-encoder.ts:323` | `src/lib/barcode-helpers.ts:48` **silent catch — falls through to POSTNET** | no user-facing error; label prints without IMb | no (silent) |
| `Error('Input must be 20, 25, 29, or 31 digits (got N)')` | `src/lib/imb-encoder.ts:328` | `src/lib/barcode-helpers.ts:48` silent fallthrough | as above | no |
| `Error('Invalid routing code length: N')` | `src/lib/imb-encoder.ts:249` | `src/lib/barcode-helpers.ts:48` silent fallthrough | as above | no |
| `Error('Codeword out of range: N')` | `src/lib/imb-encoder.ts:364` | `src/lib/barcode-helpers.ts:48` silent fallthrough | as above | no |
| `Error('POSTNET input must contain only digits')` | `src/lib/postnet-encoder.ts:35` | `src/lib/barcode-helpers.ts:58` silent catch → retry with 5-digit substring at `:62`, then final silent catch | label prints without barcode | no (silent) |
| `Error('POSTNET input must be 5, 9, or 11 digits (got N)')` | `src/lib/postnet-encoder.ts:39` | `src/lib/barcode-helpers.ts:58,62` silent catches | as above | no (silent) |

### Service

| Type | Thrown at | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `Error('User not found')` | `src/services/userService.ts:76` (`getUserIdByGuid`) | server action (e.g., `user-tools-actions.ts`, `address-labels/actions.ts:36`) propagates → component catch | inline error / toast | no |
| `Error('Tool Name is required')` | `src/services/toolService.ts:248` (`deployTool` guard) | deploy-tool UI catch → `setError` | inline error | no |
| `Error('Launch Page is required')` | `src/services/toolService.ts:249` | deploy-tool UI | inline | no |
| `Error('Tool Name must be 30 characters or fewer')` | `src/services/toolService.ts:250` | deploy-tool UI | inline | no |
| `Error('Description must be 100 characters or fewer')` | `src/services/toolService.ts:251` | deploy-tool UI | inline | no |
| `Error('Launch Page must be 1024 characters or fewer')` | `src/services/toolService.ts:252` | deploy-tool UI | inline | no |
| `Error('Additional Data must be 65 characters or fewer')` | `src/services/toolService.ts:253` | deploy-tool UI | inline | no |
| `Error('Deploy did not return a tool row — check stored procedure permissions and dev credentials.')` | `src/services/toolService.ts:273` | `src/components/dev-panel/panels/deploy-tool-actions.ts` → panel catch | inline error | no |
| Procedure invocation failure from `api_MPNextTools_UpdatePageFieldOrder` (propagates from http-client) | thrown at `http-client.ts:59`, bubbles up via `src/services/fieldManagementService.ts:93-107` | `src/components/field-management/actions.ts:69` → `{ success: false, error }` | inline error | yes (http-client layer) |

### Client-fetch (actions returning `{success, error}` envelope)

These do NOT throw to the component; server action returns `{ success: false, error }`. The component inspects that shape and calls `setError`.

| Type | Thrown at (internal) | Caught at | User-facing | Logged |
|---|---|---|---|---|
| `Unknown label stock: ${id}` (control-flow branch, not throw) | check at `src/components/address-labels/actions.ts:136,178` | same function returns `{success:false}` at `:137,:179` | mail-merge / PDF tab `setError` | no |
| `'No labels to print' / 'No labels to export' / 'No addresses to merge'` | `src/components/address-labels/actions.ts:141,183,213` (returns envelope) | tab components `setError` | inline | no |
| `'Template file exceeds 5MB limit'` | `src/components/address-labels/actions.ts:219` (returns envelope) | `mail-merge-tab.tsx:123` `setError` | inline | no |
| PDF render failure (`@react-pdf/renderer` `toBlob`) | throws inside try at `src/components/address-labels/actions.ts:157` | `:162-168` wraps as `{success:false, error: message}` | inline error | yes, `console.error('generateLabelPdf error:', error)` |
| Docx render failure (`Packer.toBuffer`) | throws inside try at `src/components/address-labels/actions.ts:190` | `:194-200` wraps as envelope | inline error | yes, `console.error('generateLabelDocx error:', error)` |
| Docxtemplater render error (tag mismatch) | throws inside `doc.render` at `src/components/address-labels/actions.ts:273` | `:279-286` wraps; if message includes `'tag'` returns prettier error | inline error | yes, `console.error('mergeTemplate error:', error)` |
| Profile fetch failure in `UserProvider` | `src/components/shared-actions/user.ts:10` (`Unauthorized`) or downstream MP error from `UserService.getUserProfile` | `src/contexts/user-context.tsx:43-46` try/catch sets `error` state | silent (consumers of `useUser()` inspect `error`) | no |
| `Error("useUser must be used within a UserProvider")` | `src/contexts/user-context.tsx:79` | uncaught — surfaces to nearest React error boundary | white-screen error unless a boundary is present | no |
| `Error("useFormField should be used within <FormField>")` | `src/components/ui/form.tsx:53` | uncaught — React error boundary | same as above | no |
| "Invalid JSON data…" (template-editor import) | `JSON.parse` throws at `src/components/template-editor/editor-import-dialog.tsx:34` | `:36` silent catch → `setError('Invalid JSON data…')` | inline error | no |
| "IMb requires a 6 or 9 digit USPS Mailer ID" (control-flow) | `src/components/address-labels/mail-merge-tab.tsx:111-114` | same function → `setError` early return | inline error | no |

## Error-handling patterns

### Server action failures
Two shapes exist; actions are inconsistent.
- **Throw-then-catch (most actions):** action throws a plain `Error`; calling component wraps call in `try/catch` and calls `setError(err instanceof Error ? err.message : 'fallback')`. Examples: `selection-actions.ts`, `user-tools-actions.ts`, `field-management/actions.ts`, `contact-records-actions.ts`, `template-editor/actions.ts`.
- **Envelope shape (`ActionError`):** action returns `{ success: false, error: string }`. Used by `address-labels/actions.ts` (PDF/docx/merge), `group-wizard/actions.ts` (`fetchGroupRecord`, `createGroup`, `updateGroup`), `field-management/actions.ts:61-72` (`savePageFieldOrder`).
- **Mixed in same file** is common — auth/validation errors throw; domain operations return envelope. No central policy; see `address-labels/actions.ts` for both shapes in one file.

### HTTP error shape (MP API)
All errors from `http-client.ts` follow: `${METHOD} ${endpoint} failed: ${status} ${statusText}${body ? ` - ${body}` : ''}`. GET / JSON-POST / JSON-PUT / GET /files/{uniqueId} include the body; FormData POST / FormData PUT / DELETE do **NOT** (inconsistent — gotcha).

### Zod validation errors (helper.ts)
`MPHelper.createTableRecords` and `MPHelper.updateTableRecords` catch `schema.parse` throws and re-wrap them as plain `Error` with message `Validation failed for record ${i}: ${validationError.message}`. The original `ZodError.issues` array is **discarded** — only `validationError.message` (Zod's default `issues` string) survives. Callers cannot programmatically inspect field-level issues. See `src/lib/providers/ministry-platform/helper.ts:189` and `:273`.

### Silent catches (deliberate fallbacks)
- **Barcode encoding cascade.** `src/lib/barcode-helpers.ts:48,58,62` — on IMb failure, silently fall through to POSTNET; on POSTNET failure, silently retry with first 5 digits; on second POSTNET failure, silently return label with no barcode. No `console.error`. Label prints with best-available barcode or none. Test coverage: `src/lib/barcode-helpers.test.ts`.
- **`ToolService.getPageData` / `getUserTools` / `getSelectionRecordIds` length checks.** `src/services/toolService.ts:132,161,189` — when the stored procedure returns empty/missing result sets, the services return `null` / `[]` rather than throwing. Callers must differentiate "no data" from "error" by checking the return value.
- **`parseToolParams` failures** (if added later) — see `src/lib/tool-params.ts`; existing conventions prefer returning defaults over throwing.

### Uncaught errors → React error boundary
- `useUser` outside `UserProvider` — `src/contexts/user-context.tsx:79`.
- `useFormField` outside `<FormField>` — `src/components/ui/form.tsx:53`.
No app-level error boundary exists as of baseline SHA `971c40b`. These crashes surface to Next.js's default error page.

### Unlogged failures
Validation errors (`src/lib/validation.ts`), user-facing session errors (`'Unauthorized'`, `'User GUID not found in session'`), and all envelope-shaped action errors (`{success:false, error}`) are NOT logged server-side. Only HTTP-level failures go through `logger.error`. Server logs will not show Zod validation problems or auth rejections unless the error is re-thrown into the http path.

## Related docs
- [call-graphs.md](call-graphs.md) — error paths in the context of full request flows
- [../mp-provider/error-handling.md](../mp-provider/error-handling.md) — MP provider-specific error flow
- [../GOTCHAS.md](../GOTCHAS.md) — symptom-first index of known traps (populated in parallel by gotchas consolidator)
- [../auth/README.md](../auth/README.md) — session/OAuth error surface

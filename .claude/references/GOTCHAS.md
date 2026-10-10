---
title: Gotchas
type: gotchas
last_updated: 2026-10-10
---

# Gotchas

Known pitfalls for agents working on MPNext-Tools. Each entry has a symptom-first title so you can grep for the error and find the fix.

## Table of contents

### Auth
- GOTCHA-001: MP API lookup returns empty / "user not found" for the signed-in user
- GOTCHA-002: TypeScript error "Property userGuid does not exist on type..."
- GOTCHA-003: Proxy lets forged/expired session cookies through
- GOTCHA-004: User lands on tool index instead of specific tool + params after sign-in
- GOTCHA-005: Sign-out redirects to `http://localhost:3000` in production
- GOTCHA-006: User appears to sign out but is silently re-authenticated (logout loop)
- GOTCHA-007: MP audit columns show wrong user (or Better Auth nanoid) in created_by/modified_by

### MP provider / API
- GOTCHA-008: First API call after cold boot fails with empty `Authorization: Bearer`
- GOTCHA-009: N concurrent MP calls on cold server trigger N OAuth token POSTs
- GOTCHA-010: Callers can't `e instanceof ZodError` after validation failure
- GOTCHA-011: Local edits to files under `src/lib/providers/ministry-platform/models/` disappear
- GOTCHA-012: Ambiguous column error when `$filter` joins tables
- GOTCHA-013: Passing `@DomainID` in `executeProcedureWithBody` causes parameter-count mismatch
- GOTCHA-014: Deploy-tool call hits production MP instance by accident
- GOTCHA-015: File uploaded but no `$userId` audit trail
- GOTCHA-016: `createCommunication` with empty `[]` attachments sends JSON not multipart
- GOTCHA-017: `getTables('Contacts')` returns multiple tables

### Services / SQL safety
- GOTCHA-018: Unescaped single quotes in `$filter` break query or enable injection
- GOTCHA-019: MP filter breaks on non-numeric record ID (NaN interpolation)
- GOTCHA-020: Field-management partial save leaves `dp_Page_Fields` inconsistent
- GOTCHA-021: Negative `Page_Field_ID` values sent to MP if passed through carelessly
- GOTCHA-022: SkipRecord / FetchAddressLabelsResult indexing returns undefined

### Testing
- GOTCHA-023: `ReferenceError: Cannot access 'mockX' before initialization`
- GOTCHA-024: `TypeError: this.mp.methodName is not a function` in service tests
- GOTCHA-025: Test passes in isolation but fails with full suite
- GOTCHA-026: Server action test crashes with `headers(...).get is not a function`

### Routing / Next.js 16
- GOTCHA-027: Next.js errors "sync dynamic API usage" or undefined `params`
- GOTCHA-028: New public route redirects to `/signin` in a loop
- GOTCHA-029: CI runs `next lint` and fails — command unknown
- GOTCHA-046: `This module cannot be imported from a Client Component module` from `server-only`
- GOTCHA-047: CI `check:prerender` fails — a route was statically prerendered

### Frontend / components
- GOTCHA-030: `useUser()` throws "useUser must be used within a UserProvider"
- GOTCHA-031: `userProfile` stays `null` and `isLoading` never resolves when session has no `userGuid`
- GOTCHA-032: `AuthWrapper` silently stops authenticating after adding `"use client"`
- GOTCHA-033: Dev overlay unexpectedly appears in production
- GOTCHA-034: Dev-panel server actions callable in production despite UI hidden
- GOTCHA-035: Dev-panel `UserToolsPanel` always shows "NOT AUTHORIZED"
- GOTCHA-036: Edit-mode Review screen shows "ID: &lt;n&gt;" for Primary Contact / Parent Group
- GOTCHA-037: Renaming `Secure_Check-in` breaks compilation in non-obvious places
- GOTCHA-038: _Retired 2026-10-10 (template editor removed)_
- GOTCHA-039: _Retired 2026-10-10 (template editor removed)_
- GOTCHA-044: A flag set inside one `setState` updater is still `false` when the next setter runs
- GOTCHA-045: `<CommandEmpty>` never renders even though the search returned nothing

### Utils / labels
- GOTCHA-040: IMb barcode silently becomes POSTNET (or disappears) with no log
- GOTCHA-041: Avery label cells misaligned after adding new stock
- GOTCHA-042: Tool page crashes when it assumes `params.pageData` is present
- GOTCHA-043: `pageID` / `recordID` values of `NaN` appear in downstream state

---

## Auth

### GOTCHA-001: MP API lookup returns empty / "user not found" for the signed-in user

**Symptom:** You pass `session.user.id` to an MP query expecting `dp_Users.User_GUID`. MP returns 0 rows, joins fail, or audit columns show the wrong user.
**Root cause:** `session.user.id` is Better Auth's internal nanoid-style ID (e.g. `1gYSNMvy6OqAm9q3DdVhtKj3Czkxd0ms`), NOT the MP `User_GUID` (UUID). The MP `sub` claim is stored in a separate `userGuid` additionalField.
**Fix:** Always use `session.user.userGuid` for MP API lookups. Needs a cast at the call site: `const userGuid = (session.user as { userGuid?: string }).userGuid`.
**Enforced where:** `src/lib/auth.ts` (`userAdditionalFields`), `src/contexts/user-context.tsx:29` (cast pattern), `src/auth.test.ts:203` (regression test).
**Related:** [auth/user-identity.md](auth/user-identity.md), [services/](services/)

### GOTCHA-002: TypeScript error "Property userGuid does not exist on type..."

**Symptom:** TS complains about `session.user.userGuid` even though the value exists at runtime.
**Root cause:** Better Auth's `customSessionClient` does not propagate `additionalFields` into its inferred session type. Runtime is correct, types are not.
**Fix:** Cast at the read site: `(session.user as { userGuid?: string }).userGuid`. Do not try to extend Better Auth's types globally.
**Enforced where:** `src/contexts/user-context.tsx:29`, `src/lib/auth.ts` (`mapProfileToUser` returns `as Record<string, unknown>`).
**Related:** [auth/README.md](auth/README.md)

### GOTCHA-003: Proxy lets forged/expired session cookies through

**Symptom:** Proxy does not redirect a broken session to `/signin`; the request reaches a route that then errors or returns empty data.
**Root cause:** `src/proxy.ts` uses `getSessionCookie()` from `better-auth/cookies`, which only checks for cookie presence — it does not decode or validate the JWT. Any forged or expired cookie passes the proxy.
**Fix:** Every protected page must render inside `(web)/layout.tsx` so `AuthWrapper` runs `auth.api.getSession()` on the server. Server actions and services that touch MP data must call `AuthorizationService.requireSecurityRole()` (CLAUDE.md practice #12). Never rely on the proxy alone for auth.
**Enforced where:** `src/proxy.ts:91-95` (cookie-presence check), `src/components/layout/auth-wrapper.tsx:5-27` (real session check).
**Related:** [auth/](auth/), [routing/](routing/)

### GOTCHA-004: User lands on tool index instead of specific tool + params after sign-in

**Symptom:** After OAuth round-trip the user is dropped at `/` or the tool index rather than the originally requested URL.
**Root cause:** `callbackUrl` is dropped somewhere in the round-trip. The proxy must forward `x-pathname` on the pass-through request, and `/signin` redirects must set `callbackUrl` to that original path. `AuthWrapper` must read `x-pathname` to build the redirect.
**Fix:** Preserve both the `x-pathname` header in `src/proxy.ts:58` and the `hdrs.get("x-pathname")` read in `src/components/layout/auth-wrapper.tsx:13`. Do not remove either without updating the other.
**Enforced where:** `src/proxy.ts:57-58` (`forwardedHeaders.set('x-pathname', fullPath)`), `src/components/layout/auth-wrapper.tsx:13-16`.
**Related:** [auth/oauth-flow.md](auth/oauth-flow.md)

### GOTCHA-005: Sign-out redirects to `http://localhost:3000` in production

**Symptom:** Clicking sign-out in prod lands the user at `http://localhost:3000` (or some other wrong base URL).
**Root cause:** `handleSignOut` uses `process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'`. If both env vars are unset in prod, the literal fallback fires silently.
**Fix:** Fixed — `handleSignOut` reads the origin through `getAuthBaseUrl()`, which throws when unset; there is no localhost fallback.
**Enforced where:** `src/components/shared-actions/sign-out.ts` (`getAuthBaseUrl()` / `getMpBaseUrl()`), `src/lib/env.ts`.
**Related:** [auth/](auth/)

### GOTCHA-006: User appears to sign out but is silently re-authenticated (logout loop)

**Symptom:** Clicking sign-out clears the cookie, but the OAuth IDP immediately re-signs-in the user because the redirect back bounces into `/signin` which rehydrates the session.
**Root cause:** The `post_logout_redirect_uri` value sent by `handleSignOut` is not registered on the MP OAuth client's allow-list, so MP ignores it and issues a fresh session.
**Fix:** Register the exact value of `BETTER_AUTH_URL` as a post-logout redirect URI on the MP OAuth client. The value must match byte-for-byte (no trailing slash drift).
**Enforced where:** `src/components/shared-actions/sign-out.ts` (`handleSignOut`).
**Related:** [auth/oauth-flow.md](auth/oauth-flow.md)

### GOTCHA-007: MP audit columns show wrong user (or Better Auth nanoid) in created_by/modified_by

**Symptom:** `Created_By`, `Modified_By`, `dp_Audit_Log` rows show the test user, an empty user, or the wrong MP user.
**Root cause:** Caller passed `session.user.id` (the Better Auth internal) as `$userId`. MP expects the numeric `User_ID` (integer), not a GUID and certainly not a nanoid.
**Fix:** Take `$userId` from the return value of `AuthorizationService.getInstance().requireSecurityRole(...)` inside the **service** (it resolves the session's `userGuid` to the numeric `dp_Users.User_ID`). Never accept it from an action argument or caller payload (CLAUDE.md practice #13).
**Enforced where:** `src/services/authorizationService.ts` (`requireSecurityRole` returns the acting `User_ID`); e.g. `src/services/groupService.ts:369,385`, `src/services/toolService.ts` (`deployTool`).
**Related:** [auth/user-identity.md](auth/user-identity.md), [services/](services/)

---

## MP provider / API

### GOTCHA-008: First API call after cold boot fails with empty `Authorization: Bearer`

**Symptom:** Fresh server boot, first MP call returns 401 with an empty Bearer.
**Root cause:** Service method forgot to `await this.client.ensureValidToken()` before `getHttpClient().get()`. Since 2026-09-30 (Step 5) the `HttpClient` 401 hook refreshes and retries once, so this now costs an extra round trip instead of failing — but it is still a bug; do not rely on the hook for a cold client.
**Fix:** Every MP-provider service method that does a network call must start with `await this.client.ensureValidToken()` (or `ensureValidDevToken()` for `api_dev_*` procs).
**Enforced where:** `src/lib/providers/ministry-platform/client.ts` (`TokenPipeline.ensureValid`). Seen correctly applied in e.g. `src/lib/providers/ministry-platform/services/file.service.ts:49`, `communication.service.ts:28,51`.
**Related:** [mp-provider/](mp-provider/)

### GOTCHA-009: N concurrent MP calls on cold server trigger N OAuth token POSTs (RESOLVED)

**Symptom:** Log shows many simultaneous `POST /oauth/connect/token` calls on a cold boot under load.
**Root cause (historical):** `ensureValidToken` had no in-flight promise de-duplication — each caller sees an expired token and each starts its own refresh.
**Fix:** Resolved. Each `TokenPipeline` in `client.ts` shares one in-flight refresh across concurrent callers, and after a failed refresh fails fast for 5–30 s (jittered negative cache) instead of stampeding the token endpoint.
**Enforced where:** `src/lib/providers/ministry-platform/client.ts` (`TokenPipeline`); pinned by `client.test.ts` "Single-flight refresh and negative cache".
**Related:** [mp-provider/](mp-provider/)

### GOTCHA-010: Callers can't `e instanceof ZodError` after validation failure

**Symptom:** Validation error surfaces as a plain `Error` with a message string; calling code cannot inspect `.issues` to build field-level UI feedback.
**Root cause:** `MPHelper.createTableRecords` / `updateTableRecords` catch the ZodError and re-throw as `new Error("Validation failed for record N: ...")`, losing the structured issue list.
**Fix:** Fixed — the helper throws `MPValidationError`, which carries the original `ZodError` as `.zodError`. Catch that and read `.zodError.issues`.
**Enforced where:** `src/lib/providers/ministry-platform/helper.ts` (`class MPValidationError`).
**Related:** [mp-provider/](mp-provider/)

### GOTCHA-011: Local edits to files under `src/lib/providers/ministry-platform/models/` disappear

**Symptom:** You hand-edit a model file, run `npm run mp:generate:models`, and the edit is gone.
**Root cause:** `npm run mp:generate:models` uses the `--clean` flag, which deletes every `.ts` file in the output dir before regeneration.
**Fix:** Never hand-edit anything under `models/`. Add runtime types to `src/lib/dto/` or wrap the generated model with a DTO. If the generator output is wrong, fix the generator in `src/lib/providers/ministry-platform/scripts/generate-types.ts`.
**Enforced where:** `src/lib/providers/ministry-platform/scripts/generate-types.ts:577-581` (`options.clean`).
**Related:** [mp-provider/](mp-provider/)

### GOTCHA-012: Ambiguous column error when `$filter` joins tables

**Symptom:** MP REST call errors with "ambiguous column name" when querying a table whose columns exist on the base table and a joined table.
**Root cause:** MP REST does not auto-qualify columns that appear in both base and joined tables. The `Contact_ID` on `Contacts` is ambiguous with `Contact_ID` on `Contact_Addresses`, for example.
**Fix:** Prefix every ambiguous column with its table: `Contacts.Contact_ID` instead of bare `Contact_ID`. For FK traversal use `FKColumn_TABLE.Column` (e.g. `Contact_ID_TABLE.First_Name`). For multi-level FK chains use underscores between `_TABLE_` hops and a single dot before the final field: `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID`.
**Enforced where:** Documented in CLAUDE.md practice #10. Examples: `src/services/userService.ts:63` (FK traversal), `src/services/addressLabelService.ts:32-38` (multi-level).
**Related:** [services/query-patterns.md](services/query-patterns.md)

### GOTCHA-013: Passing `@DomainID` in `executeProcedureWithBody` causes parameter-count mismatch

**Symptom:** Stored procedure call errors with "Procedure expected parameter @DomainID which was not supplied" or "procedure has too many arguments".
**Root cause:** The MP REST API injects `@DomainID` automatically from the OAuth token context. Passing it in the body double-binds the parameter.
**Fix:** Never include `@DomainID` in the body passed to `executeProcedureWithBody`. DO still declare `@DomainID INT` as the first parameter in the SP DDL — it is required for MP API exposure. See user's persistent memory: "@DomainID Required — All api_* stored procs MUST have @DomainID INT as first parameter for MP API".
**Enforced where:** `src/services/toolService.ts:133-135` (comment + correct pattern in `getPageData`); every `executeProcedureWithBody` call in `toolService.ts` omits `@DomainID`.
**Related:** [mp-schema/](mp-schema/), [services/](services/)

### GOTCHA-014: Deploy-tool call hits production MP instance by accident

**Symptom:** The deploy-tool flow writes rows into the production `dp_Tools` table.
**Root cause:** Procedures prefixed with `api_dev_` are routed to the dev credentials pipeline by the provider. Without that prefix, `DeployTool` would run under production credentials.
**Fix:** Keep the `api_dev_` prefix on any proc that should stay out of prod. Ensure `MINISTRY_PLATFORM_DEV_CLIENT_ID` / `MINISTRY_PLATFORM_DEV_CLIENT_SECRET` are set in `.env.local`. Keep the dev-panel localhost-only (see GOTCHA-033). Never rename these procs without checking the ProcedureService routing.
**Enforced where:** `src/services/toolService.ts:266-297` (`deployTool`), `src/lib/providers/ministry-platform/services/procedure.service.ts` (`DEV_PROC_PREFIX`), `src/lib/providers/ministry-platform/client.ts` (`dev` `TokenPipeline`).
**Related:** [mp-provider/client.md](mp-provider/client.md)

### GOTCHA-015: File uploaded but no `$userId` audit trail

**Symptom:** `dp_Files` rows appear after upload but `Modified_By` is null or the system user.
**Root cause:** `FileService.uploadFiles` sends `userId` only as a `$userId` query-string parameter, not as a FormData field. If the caller forgets to pass `params.userId` at all, no audit trail is recorded.
**Fix:** Always pass `params.userId` to `uploadFiles`. Verify MP records the audit by checking `dp_Audit_Log` rows after upload.
**Enforced where:** `src/lib/providers/ministry-platform/services/file.service.ts:100` (`$userId` query param in `uploadFiles`).
**Related:** [mp-provider/services/](mp-provider/services/)

### GOTCHA-016: `createCommunication` with empty `[]` attachments sends JSON not multipart

**Symptom:** `createCommunication(info, [])` does not exercise the multipart path even though an array was passed.
**Root cause:** Branch condition is `attachments && attachments.length > 0`. An empty array is truthy for `&&` but `length > 0` fails, so it falls through to the JSON path. This is the intended behavior but a footgun for tests that assume "array passed ⇒ multipart used".
**Fix:** Pass `undefined` (or omit the second argument) when there are no attachments. Don't assert `postFormData` was called on an empty-array fixture.
**Enforced where:** `src/lib/providers/ministry-platform/services/communication.service.ts:32,55`.
**Related:** [mp-provider/services/](mp-provider/services/)

### GOTCHA-017: `getTables('Contacts')` returns multiple tables

**Symptom:** Calling `getTables('Contacts')` returns `Contacts`, `Contact_Addresses`, `Contact_Log`, `Contact_Attributes`, etc. — not just the exact match you wanted.
**Root cause:** The MP REST `$search` parameter is a substring match, not an exact match.
**Fix:** Always post-filter: `tables.find((t) => t.Table_Name === exactName)`. Return `tables.find(...) ?? tables[0]` or raise if no exact match found.
**Enforced where:** `src/services/fieldManagementService.ts:85`.
**Related:** [services/](services/)

---

## Services / SQL safety

### GOTCHA-018: Unescaped single quotes in `$filter` break query or enable injection

**Symptom:** User types `O'Brien` into a search box; MP request fails with 400 or — worse — a SQL-like injection token is embedded verbatim into the filter.
**Root cause:** MP `$filter` accepts raw OData-style strings. If user input is interpolated without escaping, single quotes close the literal prematurely.
**Fix:** Always escape before embedding: `term.replace(/'/g, "''")`. For LIKE patterns use `escapeFilterString` from `src/lib/validation.ts:127` (bracket-escapes `[`, `%`, `_`, doubles `'`, rejects control chars and terms over `MAX_SEARCH_TERM_LENGTH`). Documented in CLAUDE.md practice #11.
**Enforced where:** `src/lib/validation.ts:127` (helper), `src/services/toolService.ts:254`, `src/services/groupService.ts` passim.
**Related:** [services/query-patterns.md](services/query-patterns.md), [dto-constants/](dto-constants/)

### GOTCHA-019: MP filter breaks on non-numeric record ID (NaN interpolation)

**Symptom:** MP returns 400 or empty result because the filter reads `WHERE Record_ID = NaN`.
**Root cause:** `parseInt('abc', 10)` returns `NaN`; if the service doesn't validate before interpolating into `` `Record_ID = ${id}` ``, `NaN` slips through.
**Fix:** Call `validatePositiveInt(id)` from `src/lib/validation.ts:33` before building any `` `ID = ${id}` `` filter. Services like `addressLabelService` batch-validate in loops; copy that pattern.
**Enforced where:** `src/services/addressLabelService.ts:83` (positive pattern), `src/lib/validation.ts:33` (helper).
**Related:** [services/query-patterns.md](services/query-patterns.md)

### GOTCHA-020: Field-management partial save leaves `dp_Page_Fields` inconsistent

**Symptom:** User edits 20 fields, save fails halfway; some changes are committed and others are not — no rollback.
**Root cause:** `FieldManagementService.updatePageFieldOrder` calls `api_MPNextTools_UpdatePageFieldOrder` once per field, 5 at a time, with no transaction wrapper. A failure in batch 3 leaves batches 1-2 committed.
**Fix:** Caller should wrap in `try/catch` and surface partial-save state. For true atomicity, rewrite `api_MPNextTools_UpdatePageFieldOrder` to accept a table-valued parameter and commit all rows in a single SP transaction.
**Enforced where:** `src/services/fieldManagementService.ts:105-130` (`updatePageFieldOrder`, `CONCURRENCY = 5`).
**Related:** [services/](services/), [components/field-management.md](components/field-management.md)

### GOTCHA-021: Negative `Page_Field_ID` values sent to MP if passed through carelessly

**Symptom:** MP rejects update with "PK violation" or silently creates a bogus row because a negative `Page_Field_ID` was sent over the wire.
**Root cause:** `fetchPageFieldData` synthesizes client-only IDs starting at `-1` and decrementing (`nextId--`) for rows that exist in the table metadata but not yet in `dp_Page_Fields`. These negative IDs are sentinel values for "not yet persisted" and must never be sent back to MP.
**Fix:** Never send `Page_Field_ID` to MP. `FieldOrderPayload` intentionally omits it. When you add a new payload type, omit `Page_Field_ID` explicitly.
**Enforced where:** `src/components/field-management/actions.ts:61-71` (negative ID synthesis).
**Related:** [components/field-management.md](components/field-management.md)

### GOTCHA-022: SkipRecord / FetchAddressLabelsResult indexing returns undefined

**Symptom:** You index `.Name` or `.ContactId` on a returned record, get `undefined`.
**Root cause:** `services.md` used to list PascalCase field names; the actual DTO uses camelCase (`name`, `contactId`, `reason`).
**Fix:** Use the actual field names from `src/lib/dto/address-label.dto.ts:17-21` (`name`, `contactId`, `reason`). Regenerate your mental model from the source, not the old docs.
**Enforced where:** `src/lib/dto/address-label.dto.ts:17-47`.
**Related:** [dto-constants/](dto-constants/)

---

## Testing

### GOTCHA-023: `ReferenceError: Cannot access 'mockX' before initialization`

**Symptom:** Test file crashes on load before any `it` runs: `ReferenceError: Cannot access 'mockExecuteProcedureWithBody' before initialization`.
**Root cause:** `vi.mock()` factories are hoisted above `const mockX = vi.fn()` declarations, so the factory references a variable that does not yet exist at the hoisted call site.
**Fix:** Wrap all mock variables in `vi.hoisted()`: `const { mockX } = vi.hoisted(() => ({ mockX: vi.fn() }))`. Then reference `mockX` freely in `vi.mock()` factories.
**Enforced where:** `src/services/toolService.test.ts:4-7` (canonical pattern).
**Related:** [testing/mocks.md](testing/mocks.md)

### GOTCHA-024: `TypeError: this.mp.methodName is not a function` in service tests

**Symptom:** Service-level test hits an MP method and the mock returns undefined or throws "not a function".
**Root cause:** `MPHelper` was mocked with `vi.fn().mockImplementation(...)` returning an object, or the class mock is missing a method the service calls.
**Fix:** Mock `MPHelper` as a class with every used method attached: `vi.mock('@/lib/providers/ministry-platform', () => ({ MPHelper: class { executeProcedureWithBody = mockExecuteProcedureWithBody; getTableRecords = mockGetTableRecords } }))`.
**Enforced where:** `src/services/toolService.test.ts:9-16`.
**Related:** [testing/mocks.md](testing/mocks.md)

### GOTCHA-025: Test passes in isolation but fails with full suite

**Symptom:** `npm test -- src/services/toolService.test.ts` passes, but `npm run test:run` fails that same file with bogus mock return values from a previous test file.
**Root cause:** The service singleton (`ServiceClass.instance`) is cached across test files. The previous file's mock `MPHelper` is still attached.
**Fix:** Reset the singleton in `beforeEach`: `(ServiceClass as any).instance = undefined`.
**Enforced where:** `src/services/toolService.test.ts:46-49` (canonical pattern).
**Related:** [testing/mocks.md](testing/mocks.md)

### GOTCHA-026: Server action test crashes with `headers(...).get is not a function`

**Symptom:** Testing a server action: `TypeError: (intermediate value).get is not a function` inside Better Auth.
**Root cause:** `next/headers` was mocked with a plain object (`{}`) or `new Map()`. Better Auth internally calls `.get('cookie')` on a `Headers` instance — plain objects don't implement that interface.
**Fix:** `vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))`. Use a real `Headers` instance.
**Enforced where:** `src/components/dev-panel/panels/user-tools-actions.test.ts:16-18` (canonical pattern).
**Related:** [testing/mocks.md](testing/mocks.md)

---

## Routing / Next.js 16

### GOTCHA-027: Next.js errors "sync dynamic API usage" or undefined `params`

**Symptom:** Build or runtime error: "Route used `params.foo`. `params` should be awaited before using its properties." Or `cookies()` returns undefined.
**Root cause:** Next.js 16 requires `params`, `searchParams`, `cookies()`, and `headers()` to be awaited. Synchronous access was removed.
**Fix:** Always `await` these APIs: `const hdrs = await headers()`, `const { id } = await params`.
**Enforced where:** `src/components/layout/auth-wrapper.tsx:6` (correct pattern).
**Related:** CLAUDE.md "Next.js 16 Notes"

### GOTCHA-028: New public route redirects to `/signin` in a loop

**Symptom:** A newly added public route (e.g. `/healthz`) bounces to `/signin` which bounces back.
**Root cause:** The proxy's early-return whitelist was not updated for the new path.
**Fix:** Add the path to `isPublicPath()` in `src/proxy.ts:26-35`. The current allowlist is `/api/auth`, `/api/auth/*`, `/signin` and `/auth-error` (exact-segment matches; every other `/api/*` route needs a session cookie).
**Enforced where:** `src/proxy.ts:26-35` (`isPublicPath`); `src/proxy.test.ts`.
**Related:** [routing/](routing/)

### GOTCHA-029: CI runs `next lint` and fails — command unknown

**Symptom:** CI fails with "Unknown command: lint" or similar from a script that invokes `next lint`.
**Root cause:** Next.js 16 removed `next lint`. This project uses ESLint flat config directly via `eslint .`.
**Fix:** Use `npm run lint`. Config is native flat config in `eslint.config.mjs`.
**Enforced where:** `package.json:13` (`"lint": "eslint ."`).
**Related:** CLAUDE.md "Next.js 16 Notes"

---

### GOTCHA-046: `This module cannot be imported from a Client Component module` from `server-only`

**Symptom:** One of three, depending on where the import runs: `next build` fails with *"You're importing a module that depends on "server-only""* and a `[Client Component Browser]` import trace; `npm run mp:generate*` (or a hand-run `tsx` on the codegen scripts) throws from `node_modules/server-only/index.js`; or a new Vitest file throws the same error.
**Root cause:** Every service, `src/lib/auth.ts`, `src/lib/env.ts`, `src/lib/tool-params.server.ts` and the MP client/credentials modules start with `import 'server-only'`. That package throws unless resolved under the `react-server` export condition, which Next applies to server code only.
**Fix:** In the build case the guard is doing its job — the trace names the client component that reached a server module; use `import type` or call a server action instead. Codegen scripts must run as `tsx --conditions=react-server …` (the `package.json` scripts already do). Vitest aliases `server-only` to the package's `empty.js` in `vitest.config.mts`; do not remove that alias.
**Enforced where:** `next build` (CI `Build` step); `vitest.config.mts` `resolve.alias`; `package.json` `mp:generate*` scripts.
**Related:** [security/README.md](security/README.md), GOTCHA-047

### GOTCHA-047: CI `check:prerender` fails — a route was statically prerendered

**Symptom:** The `Check prerendered routes` CI step lists a route; locally, the build table shows it as `○ (Static)`.
**Root cause:** The CSP nonce is read from the request at render time. A prerendered page has none, so under the enforced CSP it never hydrates — and it also skips server-side session checks.
**Fix:** Give the route a dynamic signal: a `headers()`/session read, or `export const dynamic = "force-dynamic"` in a **server** module (segment config is ignored in a `"use client"` file, the same trap as GOTCHA-032). Only Next's `/_not-found` and `/_global-error` may be static.
**Enforced where:** `scripts/check-prerender.mjs`, run by CI after `npm run build`.
**Related:** [security/README.md](security/README.md) § Nonces force dynamic rendering

## Frontend / components

### GOTCHA-030: `useUser()` throws "useUser must be used within a UserProvider"

**Symptom:** Client component crashes on render with `useUser must be used within a UserProvider`.
**Root cause:** Consumer was rendered outside the `<UserProvider>` subtree, or inside a server component that never reaches `providers.tsx`.
**Fix:** Ensure the component is a descendant of `<UserProvider>`, which is mounted in `src/app/providers.tsx`. Convert the component to a client component (`"use client"`) if it needs `useUser()`.
**Enforced where:** `src/contexts/user-context.tsx:76-82` (`useUser`).
**Related:** [contexts/](contexts/)

### GOTCHA-031: `userProfile` stays `null` and `isLoading` never resolves when session has no `userGuid`

**Symptom:** Loading spinner spins forever for a user whose session does not have a `userGuid` (e.g. edge-case cookie migration).
**Root cause:** The effect gating `loadUserProfile` only runs when `userGuid` is present AND session is settled; the "settled but no guid" branch does not set `isLoading = false` in the initial render.
**Fix:** Gate UI on `isLoading` only when a `userGuid` is expected. Handle the missing case explicitly in consumer components. See `user-context.tsx:52-60`. (Inside `(web)` this state is unreachable in practice: `AuthWrapper` redirects a session with no `userGuid` to `/session-error`.)
**Enforced where:** `src/contexts/user-context.tsx:52-60`, `src/components/layout/auth-wrapper.tsx:24-27`.
**Related:** [contexts/](contexts/)

### GOTCHA-032: `AuthWrapper` silently stops authenticating after adding `"use client"`

**Symptom:** You add `"use client"` to `auth-wrapper.tsx` for a quick fix; the app compiles but every user is treated as signed in (or the route is never protected).
**Root cause:** `AuthWrapper` must be a server component — it calls `await headers()` and `await auth.api.getSession({ headers })`. These are server-only APIs. Adding `"use client"` silently no-ops the redirect.
**Fix:** Keep `auth-wrapper.tsx` as a server component. Move any interactive state into a child client component.
**Enforced where:** `src/components/layout/auth-wrapper.tsx` (no `"use client"`).
**Related:** [components/layout.md](components/layout.md), [auth/](auth/)

### GOTCHA-033: Dev overlay unexpectedly appears in production

**Symptom:** The amber dev-panel banner shows up in a deployed environment.
**Root cause:** The self-gating lives inside `DevPanel` (`process.env.NODE_ENV === "development"` AND hostname === localhost) — not in `ToolContainer`. `ToolContainer` always renders `<DevPanel />` when `params` is provided.
**Fix:** Trust the DevPanel self-gate. If you need to hide the overlay locally (e.g. for a screenshot), drop the `params` prop from `ToolContainer`. Do NOT remove the self-gate.
**Enforced where:** `src/components/dev-panel/dev-panel.tsx:14-22,59-61` (`isLocalhost`, `isDevBuild`).
**Related:** [components/dev-panel.md](components/dev-panel.md)

### GOTCHA-034: Dev-panel server actions callable in production despite UI hidden

**Symptom:** Security scan flags that `deployToolAction` / `listPagesAction` are network-addressable in prod even though the UI is hidden.
**Root cause:** `"use server"` exports create network-addressable RPC endpoints regardless of where (or whether) the UI imports them. Only `deploy-tool-actions.ts` currently has the `requireDevSession` guard that throws on `NODE_ENV === "production"`.
**Fix:** Every dev-panel server action must call `requireDevSession()` (or an equivalent `NODE_ENV !== "production"` check) before doing any work. Fixed — every dev-panel action file now calls the shared helper.
**Enforced where:** `src/components/dev-panel/panels/require-dev-session.ts`, called by `contact-records-actions.ts`, `deploy-tool-actions.ts`, `selection-actions.ts`, `user-tools-actions.ts`.
**Related:** [components/dev-panel.md](components/dev-panel.md)

### GOTCHA-035: Dev-panel `UserToolsPanel` always shows "NOT AUTHORIZED"

**Symptom:** The dev panel's user-tools check shows a red "NOT AUTHORIZED" banner even though the user can obviously access the tool in prod.
**Root cause:** `NEXT_PUBLIC_PROD_URL` is unset (or has a trailing slash mismatch). The check is `path.includes(prodToolUrl)` where `prodToolUrl = ${prodBase}${pathname}`; if `prodBase` is empty, the match can never succeed.
**Fix:** Set `NEXT_PUBLIC_PROD_URL` in `.env.local` to the deployed tool base URL (no trailing slash). The component already renders a helpful amber banner when unset — check for that banner instead of the red one.
**Enforced where:** `src/components/dev-panel/panels/user-tools-panel.tsx:41-44,115` (handles the unset case explicitly).
**Related:** [components/dev-panel.md](components/dev-panel.md)

### GOTCHA-036: Edit-mode Review screen shows "ID: &lt;n&gt;" for Primary Contact / Parent Group

**Symptom:** In the group-wizard edit flow, the Review step shows "ID: 12345" instead of the contact's name next to Primary Contact or Parent Group.
**Root cause:** `fetchGroupRecord` returns numeric IDs only. The display maps (`contactDisplayMap`, `groupDisplayMap`) are only seeded from user interactions during the wizard flow, never from a loaded record.
**Fix:** Fixed — `fetchGroupRecord` returns `displayNames`, and the edit-mode effect seeds both display maps before `form.reset`. If you see this again, check that a new ID field is included in `displayNames`.
**Enforced where:** `src/app/(web)/tools/groupwizard/group-wizard.tsx` (edit-mode `useEffect`).
**Related:** [components/group-wizard.md](components/group-wizard.md)

### GOTCHA-037: Renaming `Secure_Check-in` breaks compilation in non-obvious places

**Symptom:** You rename the field in the Zod schema and the form compiles, but the Review step or form submission silently drops the value.
**Root cause:** The field name contains a hyphen and is referenced as a quoted string literal (`'Secure_Check-in'`) across schema, `STEP_FIELDS`, `SwitchRow`, and `step-review`. A refactor tool that only renames symbols will miss the string literals.
**Fix:** Grep-search for `Secure_Check-in` across `src/components/group-wizard` and rename at every site (`schema.ts` declaration, `STEP_FIELDS`, defaults; `step-settings.tsx`; two reads in `step-review.tsx`). TypeScript will not help you here — the key is a string literal, not a symbol.
**Enforced where:** `src/components/group-wizard/schema.ts:43` (declaration).
**Related:** [components/group-wizard.md](components/group-wizard.md)

### GOTCHA-038: _Retired_

Retired 2026-10-10: applied only to the GrapesJS template editor, which was removed along with its dependencies.

### GOTCHA-039: _Retired_

Retired 2026-10-10: applied only to the template editor's merge tokens; the editor was removed.

### GOTCHA-044: A flag set inside one `setState` updater is still `false` when the next setter runs

**Symptom:** Two state updates that must agree (e.g. remove a group from `groupedFields` *and* `groupOrder`) drift apart. A guard that looked correct never fires.
**Root cause:** React runs updater functions (`setX(prev => …)`) during the next render, not when you call the setter. Code like `let removed = false; setA(prev => { …; removed = true; … }); if (removed) setB(…)` reads `removed` before the updater has run.
**Fix:** Make the decision once, up front, from rendered state that both setters agree on (add it to the `useCallback` deps), then call both setters unconditionally.
**Enforced where:** `src/components/field-management/use-field-order-state.ts` (`removeGroup`) and its tests.
**Related:** [components/field-management.md](components/field-management.md)

### GOTCHA-045: `<CommandEmpty>` never renders even though the search returned nothing

**Symptom:** A cmdk combobox with `shouldFilter={false}` gets zero results back, but its `<CommandEmpty>` message never appears, even when it is wrapped in your own `results.length === 0` condition.
**Root cause:** `CommandEmpty` renders only when the **whole** `Command` has zero registered items (`filtered.count === 0`), not just the group it sits in. A permanent item elsewhere, such as a "+ New …" action, keeps that count above zero.
**Fix:** Don't use `CommandEmpty` alongside a permanent item. Render a plain `<div>` gated on your own state. Gate it on the term that was actually searched, too, or it flashes during the debounce while `results` still describes the previous term.
**Enforced where:** `src/app/(web)/tools/addeditfamily/add-edit-family.tsx` (`FamilySearchBar`, `searchedTerm`) and its tests.
**Related:** [components/](components/)

---

## Utils / labels

### GOTCHA-040: IMb barcode silently becomes POSTNET (or disappears) with no log

**Symptom:** User configures IMb with a Mailer ID, prints labels, and sees POSTNET (or no barcode) on the output.
**Root cause:** `preEncodeBarcodes` falls back to POSTNET when `imbEncode` throws (originally inside a bare `try {} catch {}` with no logging — now logged, see Fix). Also, if `config.mailerId` is empty (`''`), the `config.barcodeFormat === 'imb' && config.mailerId` guard skips IMb entirely and falls through silently.
**Fix:** (a) Users: enter a valid 6- or 9-digit USPS Mailer ID. (b) Code: fixed — the fallback is logged (`console.warn`) and the Mailer ID is validated.
**Enforced where:** `src/lib/barcode-helpers.ts` (logged fallback). Log payload is `{ labelIndex, error: <error name> }` — no label name, address, or routing digits (rule 14) — so locate the row by its index in the request.
**Related:** [utils/](utils/), [components/address-labels.md](components/address-labels.md)

### GOTCHA-041: Avery label cells misaligned after adding new stock

**Symptom:** Newly added Avery/custom stock prints with labels off the cells.
**Root cause:** `LABEL_STOCKS` dimensions are in PDF points (72pt = 1 inch). Contributors frequently enter inches or millimeters.
**Fix:** Always enter dimensions in points. Use the `/72 = inches` sanity check. See the `5160` entry for a reference: 612pt × 792pt = 8.5" × 11" Letter.
**Enforced where:** `src/lib/label-stock.ts:22-23` (documented in the comment above the array).
**Related:** [components/address-labels.md](components/address-labels.md)

### GOTCHA-042: Tool page crashes when it assumes `params.pageData` is present

**Symptom:** Tool route throws "Cannot read properties of undefined" on `params.pageData.Table_Name` or similar.
**Root cause:** `parseToolParams` (`src/lib/tool-params.server.ts`) catches errors from `ToolService.getPageData` and leaves `pageData` as `undefined`. The SP `api_Tools_GetPageData` may not exist yet in the target MP instance (dev/new installs).
**Fix:** Always treat `pageData` as optional at consumption sites: guard with `if (params.pageData) { ... }`. Never destructure it without a null check.
**Enforced where:** `src/lib/tool-params.server.ts:65-76` (catch + undefined assignment).
**Related:** [utils/](utils/)

### GOTCHA-043: `pageID` / `recordID` values of `NaN` appear in downstream state

**Symptom:** Downstream code receives `NaN` as a numeric param and constructs a filter `WHERE Contact_ID = NaN`, producing no rows and a confusing log.
**Root cause:** `parseToolParams` uses `x ? parseInt(x, 10) : undefined`. `parseInt('abc', 10)` returns `NaN` (not undefined), so `NaN` leaks through.
**Fix:** Fixed — `parseIntOrUndefined` returns `undefined` unless `Number.isFinite(parsed)`.
**Enforced where:** `src/lib/tool-params.server.ts` (`parseIntOrUndefined`).
**Related:** [utils/](utils/)

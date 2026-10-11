---
title: Call graphs
domain: data-flow
type: reference
applies_to: [src/proxy.ts, src/components/layout/auth-wrapper.tsx, src/lib/auth.ts, src/app/(web)/tools/**, src/services/**, src/contexts/user-context.tsx]
symbols: []
related: [error-catalog.md, ../auth/README.md, ../mp-provider/README.md, ../services/README.md, ../security/README.md]
last_verified: 2026-10-10
---

## Flow 1: Auth — protected route hit

**Trigger:** unauthenticated GET to any path under `/tools/**` (or any non-public route).
**Entry point:** `src/proxy.ts:proxy`

**Stack trace:**
1. `src/proxy.ts:37` — `proxy(request)` builds the CSP + nonce, then sets `x-pathname` (`src/proxy.ts:58`), `x-nonce` and the CSP header on the forwarded request headers.
2. `src/proxy.ts:86-88` — early `passThrough()` if `isPublicPath(pathname)` (`/api/auth`, `/api/auth/*`, `/signin`, `/auth-error` — `src/proxy.ts:26-35`).
3. `src/proxy.ts:91` — `getSessionCookie(request)` from `better-auth/cookies`.
4. `src/proxy.ts:93-95` — if no cookie: `redirectToSignin()` (`src/proxy.ts:80-84`) → `NextResponse.redirect('/signin?callbackUrl=<fullPath>')`; stop.
5. If cookie present: `src/proxy.ts:97` — `passThrough()`; request reaches `src/app/(web)/layout.tsx:28` (`WebLayout`).
6. `src/app/(web)/layout.tsx:34` — layout wraps children in `<AuthWrapper>`.
7. `src/components/layout/auth-wrapper.tsx:6-7` — `await headers()` then `auth.api.getSession({ headers })`.
8. `src/components/layout/auth-wrapper.tsx:9-17` — on no session: read `x-pathname`, build `/signin?callbackUrl=...`, `redirect(...)`.
9. `src/components/layout/auth-wrapper.tsx:25-28` — session without `userGuid` → `redirect("/session-error")`.
10. Browser lands on `src/app/signin/page.tsx:25` (`SignIn`, `force-dynamic`), which renders `SignInContent` inside `<Suspense>`.
11. `src/app/signin/sign-in-content.tsx:179` — `authClient.signIn.social({ provider: "ministryplatform", callbackURL })` kicks off OAuth. See `../auth/oauth-flow.md`.

**Side effects:**
- Request headers set (internal): `x-pathname = <pathname + search>`, `x-nonce`, CSP header (`src/proxy.ts:57-67`).
- Response headers: CSP (+ `Reporting-Endpoints` when configured) on every proxied response (`withCsp`, `src/proxy.ts:69-75`).
- HTTP 307 redirect to `/signin?callbackUrl=...` from proxy when cookie absent (`NextResponse.redirect` default status).
- Server-side `redirect(...)` (Next.js exception) from AuthWrapper when session absent (`src/components/layout/auth-wrapper.tsx:16`).

**Error paths:**
- Cookie-read throws: caught at `src/proxy.ts:99-105`, logs `proxy.session_check_failed` (message only, never the path) and redirects to `/signin` with the same callbackUrl.
- `auth.api.getSession` throws: **not** wrapped in `AuthWrapper` — propagates to the nearest error boundary (`src/app/(web)/error.tsx`).

**Return shape:** `NextResponse` (redirect or pass-through) from proxy; rendered React tree from `WebLayout` when authed.

**Related:**
- `../auth/oauth-flow.md` — full OAuth round-trip (continues from step 11)
- `../auth/sessions.md` — JWE cookie cache, `customSession`
- `../routing/proxy.md` — proxy matcher and header forwarding

---

## Flow 2: Tool page load

**Trigger:** authenticated GET to a tool route, e.g. `/tools/addresslabels?pageID=304&s=12345`.
**Entry point:** `src/app/(web)/tools/<tool>/page.tsx` (default export server component).

**Stack trace:**
1. `src/app/(web)/layout.tsx:34` — `AuthWrapper` gate (see Flow 1).
2. `src/app/(web)/tools/layout.tsx:31-34` — `AuthorizationService.getInstance().hasSecurityRole()`; `redirect("/no-access")` if false. UX only — **not** enforcement for the page (Next 16 renders the page segment independently of the layout).
3. `src/app/(web)/tools/addresslabels/page.tsx:9` — `AddressLabelsPage({ searchParams })`.
4. `src/app/(web)/tools/addresslabels/page.tsx:11` — `requireToolAccess({ table: 'Contacts', operation: 'read' })` (`src/app/(web)/tools/require-tool-access.ts:29-36`) → `requireSecurityRole`; `UnauthorizedError` → `redirect("/no-access")`, any other error rethrows.
5. `src/app/(web)/tools/addresslabels/page.tsx:13` — `parseToolParams(await searchParams)` (Next.js 16 async dynamic API).
6. `src/lib/tool-params.server.ts:43` — `parseToolParams` reads `pageID`, `s`, `sc`, `p`, `q`, `v`, `recordID`, `recordDescription`, `addl`; integers via `parseIntOrUndefined` (non-numeric → `undefined`), `recordDescription` via `safeDecode`.
7. `src/lib/tool-params.server.ts:66-77` — if `pageID` parsed: dynamic `import("@/services/toolService")` → `ToolService.getInstance()` → `toolService.getPageData(parsedPageID)`. On throw: `console.warn('tool_params.page_data_unavailable', { pageID })` and `pageData = undefined`.
8. `src/services/toolService.ts:126-130` — `getPageData(pageID)` gates `dp_Pages`/`read` (memoized — same request).
9. `src/services/toolService.ts:134` — `this.mp!.executeProcedureWithBody('api_Tools_GetPageData', { '@PageID': pageID })`.
10. `src/lib/providers/ministry-platform/helper.ts:578` — `MPHelper.executeProcedureWithBody` → `provider.executeProcedureWithBody` → `ProcedureService` → `HttpClient.post('/procs/api_Tools_GetPageData', ...)`.
11. `src/services/toolService.ts:139-142` — unwraps `result[0][0]` as `PageData`.
12. `src/app/(web)/tools/addresslabels/page.tsx:15` — renders `<AddressLabels params={params} />` (client subtree).

**Side effects:**
- MP API calls: `GET /tables/dp_Users` + `GET /tables/dp_User_Roles` (authorization decision, once per request via React `cache()`), then `POST /procs/api_Tools_GetPageData`. First call within token TTL triggers a token fetch — see `../mp-provider/client.md`.
- Cookie set: none (read-only flow).

**Error paths:**
- No security role → `redirect("/no-access")` (layout, and again at `requireToolAccess`).
- MP unreachable during the gate → error propagates to `src/app/(web)/error.tsx` (not converted to "no access").
- `api_Tools_GetPageData` failure → `HttpClient` throws `Error('POST /procs/... failed: <status>')` at `src/lib/providers/ministry-platform/utils/http-client.ts:226` → rethrown by `ToolService.getPageData` → swallowed in `parseToolParams` (`pageData = undefined`).

**Return shape:** `ToolParams` per `src/lib/tool-params.ts:28-39` (fields + optional `pageData: PageData`).

**Related:**
- `../services/tool-service.md` — `getPageData` contract
- `../utils/tool-params.md` — parser details
- `../mp-schema/required-procs.md` — `api_Tools_GetPageData` shape
- `../routing/app-router.md` — tool page convention

---

## Flow 3: Selection resolution

**Trigger:** user opens a tool with `?s=<selectionId>&pageID=<pageId>` or clicks "Resolve Selection" in dev-panel.
**Entry point:** `src/components/dev-panel/panels/selection-actions.ts:resolveSelection` (dev-panel path) **or** `src/components/address-labels/actions.ts:fetchAddressLabels` (tool path).

**Stack trace (dev-panel variant):**
1. `src/components/dev-panel/panels/selection-actions.ts:11` — `resolveSelection(selectionId, pageId)` (server action).
2. `src/components/dev-panel/panels/selection-actions.ts:15` — `requireDevSession('Dev panel')` (`src/components/dev-panel/panels/require-dev-session.ts`): throws in production, or if no session `user.id`.
3. `src/components/dev-panel/panels/selection-actions.ts:17-20` — `ToolService.getInstance()` → `toolService.getSelectionRecordIds(selectionId, pageId)`.
4. `src/services/toolService.ts:163-166` — `requireSecurityRole({ table: 'dp_Selections', operation: 'read' })` returns the acting MP `User_ID` (resolved from `session.user.userGuid` → `dp_Users.User_ID` inside `AuthorizationService`).
5. `src/services/toolService.ts:168-172` — `mp.executeProcedureWithBody('api_Common_GetSelection', { '@SelectionID', '@UserID': userId, '@PageID' })`.
6. `src/services/toolService.ts:175-182` — finds the result set containing `Record_ID` and maps it.
7. Returns `{ recordIds, count }` to client.

**Stack trace (address-labels variant):** step 1 is `src/components/address-labels/actions.ts:116` `fetchAddressLabels(params, config)`, step 2 is `requireAccess('Contacts', 'read')` (line 120), then the same `getSelectionRecordIds(params.s, params.pageID)` call (line 130).

**Side effects:**
- MP API calls: `GET /tables/dp_Users` + `GET /tables/dp_User_Roles` (gate, memoized per request), `POST /procs/api_Common_GetSelection`.
- The MP procedure is **user-scoped** — `@UserID` comes only from the gate, so a caller cannot read another user's selection.

**Error paths:**
- Production build → `Error('Dev panel is not available in production.')` from `requireDevSession`.
- No session → `Error('Unauthorized - Missing user session data')` from `requireDevSession`.
- No MP user / no role / roles unconfigured → `UnauthorizedError` from `requireSecurityRole` (logged as `mp.read.unauthorized`).
- MP procedure failure → `HttpClient` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:226`; rethrown by `ToolService.getSelectionRecordIds`.

**Return shape:** `{ recordIds: number[], count: number }` (dev-panel variant — `SelectionResult` at `src/components/dev-panel/panels/selection-actions.ts:6-9`).

**Related:**
- `../services/tool-service.md` — `getSelectionRecordIds` contract
- `../mp-schema/required-procs.md` — `api_Common_GetSelection`
- `../components/dev-panel.md` — selection panel UI

---

## Flow 4: Address label fetch

**Trigger:** user clicks "Generate" on the address-labels tool after configuring stock, start position, etc.
**Entry point:** `src/components/address-labels/actions.ts:fetchAddressLabels`

**Stack trace:**
1. `src/components/address-labels/actions.ts:116` — `fetchAddressLabels(params, config)`.
2. `src/components/address-labels/actions.ts:120` — `requireAccess('Contacts', 'read')` (helper at lines 44-49 → `requireSecurityRole`).
3. `src/components/address-labels/actions.ts:122` — `AddressLabelService.getInstance()`.
4. **Selection mode** (`params.s && params.pageID`, line 124): `ToolService.getInstance().getSelectionRecordIds(params.s, params.pageID)` (lines 129-130) — see Flow 3 steps 4-6. Empty result → `{ printable: [], skipped: [] }`.
5. `src/components/address-labels/actions.ts:136` — `addressService.getAddressesForContacts(contactIds)`.
6. `src/services/addressLabelService.ts:70-97` — gates `Contacts`/`read`, then batches in groups of `MP_FETCH_BATCH_SIZE` (100, `src/lib/constants.ts`); for each batch validates every ID via `validatePositiveInt`, calls `mp.getTableRecords({ table: 'Contacts', select: SELECT_FIELDS, filter: 'Contact_ID IN (...)', orderBy: 'Household_ID_TABLE_Address_ID_TABLE.Postal_Code' })`.
7. **Single-record mode** (`params.recordID && params.recordID !== -1`, line 138): `addressService.getAddressForContact(params.recordID)` (line 140) → `src/services/addressLabelService.ts:102-117` (gate, `validatePositiveInt`, `top: 1`).
8. `src/components/address-labels/actions.ts:52-114` — `filterAndTransform(rows, config)`: applies skip rules (opt-out, no address, no postal code, no barcode unless `includeMissingBarcodes`, no household in household mode), deduplicates households when `addressMode === 'household'`, sorts by `postalCode`.

**Side effects:**
- MP API calls: gate reads (once per request); one `POST /procs/api_Common_GetSelection` per selection fetch; `ceil(contactIds.length / 100)` calls to `GET /tables/Contacts` with FK-joined select.
- No DB writes.

**Error paths:**
- Not authorized → `UnauthorizedError` from `requireAccess` (action) or the service gate.
- Invalid `Contact_ID` → `validatePositiveInt` throws `'Expected positive integer'` (both modes).
- MP failure → `HttpClient` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:226`; propagates through service and action (no try/catch in `fetchAddressLabels`).

**Return shape:** `FetchAddressLabelsResult` (`{ printable: LabelData[], skipped: SkipRecord[] }`) from `@/lib/dto`.

**Related:**
- `../services/address-label-service.md` — service contract and `SELECT_FIELDS`
- `../components/address-labels.md` — UI subpages and next-step flows (PDF / mail merge)
- `../mp-provider/services/table.md` — `getTableRecords` path

---

## Flow 5: User profile load

**Trigger:** `UserProvider` mounts (any authenticated page wrapped in `<Providers>`).
**Entry point:** `src/contexts/user-context.tsx:UserProvider`

**Stack trace:**
1. `src/contexts/user-context.tsx:21` — `UserProvider({ children })` renders.
2. `src/contexts/user-context.tsx:22` — `authClient.useSession()` (reactive subscription to the session cookie cache).
3. `src/contexts/user-context.tsx:29` — derive `userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid`.
4. `src/contexts/user-context.tsx:51-58` — `useEffect` fires when `!isPending && userGuid`: calls `loadUserProfile()` (line 54).
5. `src/contexts/user-context.tsx:31-49` — `loadUserProfile` sets `isLoading=true`, calls `getCurrentUserProfile()` (line 41) with no arguments.
6. `src/components/shared-actions/user.ts:25` — server action `getCurrentUserProfile()`; takes no parameters, so a caller cannot name another user (IDOR).
7. `src/components/shared-actions/user.ts:26-28` — `auth.api.getSession({ headers: await headers() })`, then derive `userGuid` from `session.user`; throws `'Unauthorized'` unless it is a non-empty string.
8. `src/components/shared-actions/user.ts:30-31` — `UserService.getInstance()` → `userService.getUserProfile(userGuid)`. No `AuthorizationService` gate — documented rule-12 carve-out (own profile only).
9. `src/services/userService.ts` `getUserProfile` — runs 1 MP query: `mp.getTableRecords('dp_Users', { filter: "User_GUID = '<guid>'", select: "Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address", top: 1 })`.
10. Same method — maps the row explicitly to `{ First_Name, Nickname, Last_Name, Email_Address: ?? null }` (no spread, so nothing else MP returns reaches the client).
11. `src/contexts/user-context.tsx:42` — `setUserProfile(profile ?? null)`.

**Side effects:**
- MP API calls: 1 `GET /tables/dp_Users` per mount (first run per fresh process triggers token fetch).
- No cookie changes (session read from the cookie cache).

**Error paths:**
- Server action throws → caught at `src/contexts/user-context.tsx:43-45` → sets `error` state, `userProfile = null`.
- Session `userGuid` missing or empty → `Error('Unauthorized')` at `src/components/shared-actions/user.ts:28`. (Not keyed on `session.user.id` — that is Better Auth's internal ID and does not prove an MP identity.)
- Profile row missing → `userProfile = undefined` returned by `getUserProfile` (`if (!row) return undefined`); normalized to `null` in context (line 42).

**Return shape:** `MPUserProfile | null` in context state (`First_Name`, `Nickname`, `Last_Name`, `Email_Address` only).

**Related:**
- `../contexts/user-provider.md` — hook usage, lifecycle
- `../services/user-service.md` — `getUserProfile` contract
- `../auth/sessions.md` — why `userGuid` (additionalField) is needed instead of `user.id`

---

## Flow 6: Sign-out (OIDC logout)

**Trigger:** user submits a sign-out form — on `/no-access` (signed in, no MP security role) or `/session-error` (session without `userGuid`). These are the app's only sign-out controls (the dropdown `UserMenu` was removed 2026-10-10).
**Entry points:** `src/app/(web)/no-access/page.tsx` and `src/app/session-error/page.tsx` — `<form action={handleSignOut}>`.

**Stack trace:**
1. `src/components/shared-actions/sign-out.ts:50` — `handleSignOut` (`'use server'`).
2. `auth.api.signOut({ headers, body: { disableRedirect: true } })` — clears the Better Auth session cookie **first** (via the `nextCookies()` plugin), and returns better-auth's provider logout URL.
3. `idTokenHintFrom(...)` — takes `id_token_hint` from that URL only if its origin is the MP origin.
4. Rebuilds `${getMpBaseUrl()}/oauth/connect/endsession?post_logout_redirect_uri=<getAuthBaseUrl()>&client_id=<getMpClient().clientId>[&id_token_hint=…]`.
5. `redirect(...)` — a `NEXT_REDIRECT` throw that Next turns into the navigation.
6. Browser follows to MP endsession; MP clears its session and 302s back to `BETTER_AUTH_URL`.
7. Next request → proxy sees no cookie → `/signin` (see Flow 1).

**Side effects:**
- Cookie cleared: Better Auth session cookie.
- HTTP redirect to MP `/oauth/connect/endsession` with `post_logout_redirect_uri` and `client_id`, plus `id_token_hint` when this process still holds the id_token (see `../auth/oauth-flow.md` § Limitation).

**Error paths:**
- Bad/missing `MINISTRY_PLATFORM_BASE_URL`, `BETTER_AUTH_URL` or MP client env → `src/lib/env.ts` readers throw (values never echoed). The app session is already cleared by then.
- `auth.api.signOut` failure → propagates out of the action.

**Return shape:** `never` (always redirects or throws).

**Related:**
- `../auth/oauth-flow.md` — sign-out section
- `../auth/sessions.md` — what `auth.api.signOut` clears

---

## Flow 7: Record create (group create)

**Trigger:** user completes the Group Wizard and clicks "Submit" on the final step.
**Entry point:** `src/app/(web)/tools/groupwizard/group-wizard.tsx:140` (`handleSubmit`) → server action `createGroup`.

**Stack trace:**
1. `src/app/(web)/tools/groupwizard/group-wizard.tsx:140-155` — `handleSubmit` calls `updateGroup(params.recordID, data)` in edit mode (line 145) or `createGroup(data)` in create mode (line 147).
2. `src/components/group-wizard/actions.ts:94` — `createGroup(data)` server action.
3. `src/components/group-wizard/actions.ts:98` — `requireAccess('Groups', 'create')` → `requireSecurityRole`.
4. `src/components/group-wizard/actions.ts:99-100` — `parseGroupPayload(data)` (`groupWizardSchema.safeParse`, strips unknown keys); invalid → `{ success: false, error: 'Invalid group data: <field paths>' }`.
5. `src/components/group-wizard/actions.ts:101-102` — `GroupService.getInstance()` → `service.createGroup(parsed.data)` (no user ID passed).
6. `src/services/groupService.ts:365-379` — `createGroup`:
   - `requireSecurityRole({ table: 'Groups', operation: 'create' })` → `$userId` (memoized decision from step 3).
   - `prepareForApi(data)` (defined at line 95) — keeps only `GROUP_WRITABLE_FIELDS`, converts `Start_Date` / `End_Date` / `Promotion_Date` via `DomainTimezoneService.toMpSqlDatetime`.
   - `mp.createTableRecords('Groups', [apiData], { $select: 'Group_ID, Group_Name', $userId })`.
7. `src/lib/providers/ministry-platform/helper.ts:197-243` — `MPHelper.createTableRecords`:
   - If `schema` provided (not in this flow), runs `schema.parse(record)` per record (lines 209-228); throws `MPValidationError` (`'Validation failed for record <i>: ...'`) on failure.
   - `provider.createTableRecords(table, validatedRecords, providerParams)` (line 232).
8. `MinistryPlatformProvider` → `TableService.createTableRecords` → `HttpClient.post('/tables/Groups', [apiData], { $select: ..., $userId: ... })`.
9. Returns array of created records; service unwraps `result[0]` at `src/services/groupService.ts:378`.
10. `src/components/group-wizard/actions.ts:103` — returns `{ success: true, groupId, groupName }`.
11. Back on client (`src/app/(web)/tools/groupwizard/group-wizard.tsx:150-154`): on success, `setSubmitResult(...)`; on failure, `setLoadError(result.error)`.

**Side effects:**
- MP API call: `POST /tables/Groups` with `$userId=<mp user id>` → MP writes one row to `Groups` table (`Group_ID` auto-generated).
- DB write: `Groups` row (and any FK constraints MP enforces, e.g. `Group_Type_ID`).
- Input validation happens in the action (`groupWizardSchema`) and the service allowlist; `MPHelper`'s optional `schema` parameter is **not** used here.

**Error paths:**
- Not authorized → `UnauthorizedError` from `requireAccess` or the service gate; caught at `src/components/group-wizard/actions.ts:104-106` and returned as `{ success: false, error }`.
- Payload fails `groupWizardSchema` → `{ success: false, error: 'Invalid group data: ...' }` (field names only, never values).
- `toMpSqlDatetime` on an unparseable date → `Error('toMpSqlDatetime: value could not be parsed as a date')`.
- MP HTTP failure → `HttpClient` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:226`; propagates to action catch block → `{ success: false, error: <message> }`.

**Return shape:** `CreateGroupResult | ActionError` — on success `{ success: true, groupId: number, groupName: string }`.

**Related:**
- `../services/group-service.md` — `GroupService.createGroup` + `prepareForApi`
- `../components/group-wizard.md` — wizard steps and form
- `../mp-provider/services/table.md` — `createTableRecords` path
- `../ministryplatform.datetimehandling.md` — date conversion at the MP boundary

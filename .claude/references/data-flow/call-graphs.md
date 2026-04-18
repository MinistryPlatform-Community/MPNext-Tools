---
title: Call graphs
domain: data-flow
type: reference
applies_to: [src/proxy.ts, src/components/layout/auth-wrapper.tsx, src/lib/auth.ts, src/app/(web)/tools/**, src/services/**, src/contexts/user-context.tsx]
symbols: []
related: [error-catalog.md, ../auth/README.md, ../mp-provider/README.md, ../services/README.md]
last_verified: 2026-04-17
---

## Flow 1: Auth — protected route hit

**Trigger:** unauthenticated GET to any path under `/tools/**` (or any non-public route).
**Entry point:** `src/proxy.ts:proxy`

**Stack trace:**
1. `src/proxy.ts:4` — `proxy(request)` sets `x-pathname` header on forwarded request headers (`src/proxy.ts:12-13`).
2. `src/proxy.ts:18` — early return `passThrough()` if path is `/api/*` or `/signin`.
3. `src/proxy.ts:24` — `getSessionCookie(request)` from `better-auth/cookies`.
4. `src/proxy.ts:26-31` — if no cookie: build `/signin?callbackUrl=<fullPath>` and `NextResponse.redirect(signinUrl)`; stop.
5. If cookie present: `src/proxy.ts:34` — `passThrough()`; request reaches `src/app/(web)/layout.tsx:28` (`WebLayout`).
6. `src/app/(web)/layout.tsx:34` — layout wraps children in `<AuthWrapper>`.
7. `src/components/layout/auth-wrapper.tsx:6-7` — `await headers()` then `auth.api.getSession({ headers })`.
8. `src/components/layout/auth-wrapper.tsx:9-17` — on no session: read `x-pathname`, build `/signin?callbackUrl=...`, `redirect(...)`.
9. Browser lands on `src/app/signin/page.tsx:7` (`SignInContent`).
10. `src/app/signin/page.tsx:25-28` — `authClient.signIn.oauth2({ providerId: "ministry-platform", callbackURL })` kicks off OAuth. See `../auth/oauth-flow.md`.

**Side effects:**
- Request header set (internal): `x-pathname = <pathname + search>` (`src/proxy.ts:13`).
- HTTP 302 to `/signin?callbackUrl=...` from proxy when cookie absent (`src/proxy.ts:30`).
- Server-side `redirect(...)` (Next.js exception) from AuthWrapper when session absent (`src/components/layout/auth-wrapper.tsx:16`).
- Log: `Proxy: Redirecting to signin - no session cookie` (`src/proxy.ts:27`).

**Error paths:**
- Cookie-read throws: caught at `src/proxy.ts:36-41`, logs and redirects to `/signin` with the same callbackUrl.
- `auth.api.getSession` throws: **not** wrapped in `AuthWrapper` — propagates to Next.js error boundary (`src/app/(web)/error.tsx`).

**Return shape:** `NextResponse` (redirect or pass-through) from proxy; rendered React tree from `WebLayout` when authed.

**Related:**
- `../auth/oauth-flow.md` — full OAuth round-trip (continues from step 10)
- `../auth/sessions.md` — JWT cookie, `cookieCache`, `customSession`
- `../routing/proxy.md` — proxy matcher and header forwarding

---

## Flow 2: Tool page load

**Trigger:** authenticated GET to a tool route, e.g. `/tools/addresslabels?pageID=304&s=12345`.
**Entry point:** `src/app/(web)/tools/<tool>/page.tsx` (default export server component).

**Stack trace:**
1. `src/app/(web)/layout.tsx:34` — `AuthWrapper` gate (see Flow 1).
2. `src/app/(web)/tools/addresslabels/page.tsx:8` — `AddressLabelsPage({ searchParams })` awaits `searchParams` (Next.js 16 async dynamic API).
3. `src/app/(web)/tools/addresslabels/page.tsx:9` — `parseToolParams(await searchParams)`.
4. `src/lib/tool-params.ts:30` — `parseToolParams` reads `pageID`, `s`, `sc`, `p`, `q`, `v`, `recordID`, `recordDescription`, `addl`.
5. `src/lib/tool-params.ts:53-60` — if `pageID` present: `ToolService.getInstance()` → `toolService.getPageData(parsedPageID)`. On throw: `console.warn` and set `pageData = undefined` (`src/lib/tool-params.ts:57-60`).
6. `src/services/toolService.ts:123` — `getPageData(pageID)`.
7. `src/services/toolService.ts:127` — `this.mp!.executeProcedureWithBody('api_Tools_GetPageData', { '@PageID': pageID })`.
8. `src/lib/providers/ministry-platform/helper.ts:544` — `MPHelper.executeProcedureWithBody` → `provider.executeProcedureWithBody` → `ProcedureService` → `HttpClient.post('/procs/api_Tools_GetPageData', ...)`.
9. `src/services/toolService.ts:132-137` — unwraps `result[0][0]` as `PageData`.
10. `src/app/(web)/tools/addresslabels/page.tsx:11` — renders `<AddressLabels params={params} />` (client subtree).

**Side effects:**
- MP API call: `POST /procs/api_Tools_GetPageData` (first tool page hit within token TTL triggers token refresh — see `../mp-provider/client.md`).
- Cookie set: none (read-only flow).

**Error paths:**
- `api_Tools_GetPageData` not found / SP errors → `HttpClient.post` throws `Error('POST /procs/... failed: ...')` at `src/lib/providers/ministry-platform/utils/http-client.ts:59` → rethrown by `ToolService.getPageData` at `src/services/toolService.ts:138-140` → caught in `parseToolParams` at `src/lib/tool-params.ts:57-60` (swallowed to `pageData = undefined`).
- All other `parseToolParams` field parsing: synchronous — invalid `Number` produces `NaN`, no throw.

**Return shape:** `ToolParams` per `src/lib/tool-params.ts:17-28` (fields + optional `pageData: PageData`).

**Related:**
- `../services/tool-service.md` — `getPageData` contract
- `../mp-schema/required-procs.md` — `api_Tools_GetPageData` shape
- `../routing/app-router.md` — tool page convention

---

## Flow 3: Selection resolution

**Trigger:** user opens a tool with `?s=<selectionId>&pageID=<pageId>` or clicks "Resolve Selection" in dev-panel.
**Entry point:** `src/components/dev-panel/panels/selection-actions.ts:resolveSelection` (dev-panel path) **or** `src/components/address-labels/actions.ts:fetchAddressLabels` (tool path).

**Stack trace (dev-panel variant):**
1. `src/components/dev-panel/panels/selection-actions.ts:13` — `resolveSelection(selectionId, pageId)` (server action).
2. `src/components/dev-panel/panels/selection-actions.ts:17` — `auth.api.getSession({ headers: await headers() })`; throws `'Unauthorized'` at line 18 if no user.
3. `src/components/dev-panel/panels/selection-actions.ts:20-21` — reads `(session.user as {userGuid}).userGuid`; throws `'User GUID not found in session'` if absent.
4. `src/components/dev-panel/panels/selection-actions.ts:23-24` — `UserService.getInstance()` → `userService.getUserIdByGuid(userGuid)`.
5. `src/services/userService.ts:68-79` — `getUserIdByGuid` runs `mp.getTableRecords('dp_Users', { select: 'User_ID', filter: "User_GUID = '<guid>'", top: 1 })`; throws `'User not found'` at line 76 if empty.
6. `src/components/dev-panel/panels/selection-actions.ts:26-27` — `ToolService.getInstance()` → `toolService.getSelectionRecordIds(selectionId, userId, pageId)`.
7. `src/services/toolService.ts:152-174` — `getSelectionRecordIds` calls `mp.executeProcedureWithBody('api_Common_GetSelection', { '@SelectionID', '@UserID', '@PageID' })` (line 154) and finds the result set containing `Record_ID` (line 163).
8. Returns `{ recordIds, count }` to client.

**Stack trace (address-labels variant):** same, but step 1 is `src/components/address-labels/actions.ts:99` `fetchAddressLabels(params, config)` and `getMPUserId` is the helper at `src/components/address-labels/actions.ts:34-40`.

**Side effects:**
- MP API call: `POST /procs/api_Common_GetSelection` (`src/services/toolService.ts:154`).
- MP API call: `GET /tables/dp_Users?$select=User_ID&$filter=User_GUID='<guid>'` (`src/services/userService.ts:69-74`).
- The MP procedure is **user-scoped** — `@UserID` must be the correct MP numeric ID or an empty set is returned.

**Error paths:**
- No session → `Error('Unauthorized')` thrown at `src/components/dev-panel/panels/selection-actions.ts:18`.
- Missing `userGuid` on session → `Error('User GUID not found in session')` at `src/components/dev-panel/panels/selection-actions.ts:21`.
- User GUID not in MP → `Error('User not found')` at `src/services/userService.ts:76`.
- MP procedure failure → `HttpClient.post` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:59`; rethrown by `ToolService.getSelectionRecordIds` at `src/services/toolService.ts:171-173`.

**Return shape:** `{ recordIds: number[], count: number }` (dev-panel variant — `SelectionResult` at `src/components/dev-panel/panels/selection-actions.ts:8-11`).

**Related:**
- `../services/tool-service.md` — `getSelectionRecordIds` contract
- `../mp-schema/required-procs.md` — `api_Common_GetSelection`
- `../components/dev-panel.md` — selection panel UI

> **Note:** JSDoc at `src/services/toolService.ts:145` says `api_CloudTools_GetSelection` but the call at line 154 uses `api_Common_GetSelection`. Tracked in TODO `2026-04-17-services-stale-cloudtools-comment.md`.

---

## Flow 4: Address label fetch

**Trigger:** user clicks "Generate" on the address-labels tool after configuring stock, start position, etc.
**Entry point:** `src/components/address-labels/actions.ts:fetchAddressLabels`

**Stack trace:**
1. `src/components/address-labels/actions.ts:99` — `fetchAddressLabels(params, config)`.
2. `src/components/address-labels/actions.ts:103` — `getSession()` (local helper at line 28); throws `'Unauthorized'` if no `session.user.id`.
3. `src/components/address-labels/actions.ts:105` — `AddressLabelService.getInstance()`.
4. **Selection mode** (`params.s && params.pageID`, line 107): `getMPUserId(session)` (line 109, helper at lines 34-40) → `ToolService.getInstance().getSelectionRecordIds(...)` (line 111) — see Flow 3 steps 6-7.
5. `src/components/address-labels/actions.ts:117` — `addressService.getAddressesForContacts(contactIds)`.
6. `src/services/addressLabelService.ts:69-90` — batches in groups of 100 (`BATCH_SIZE` at line 21); for each batch validates every ID via `validatePositiveInt`, calls `mp.getTableRecords({ table: 'Contacts', select: SELECT_FIELDS, filter: 'Contact_ID IN (...)', orderBy: 'Household_ID_TABLE_Address_ID_TABLE.Postal_Code' })`.
7. **Single-record mode** (`params.recordID && params.recordID !== -1`, line 119): `addressService.getAddressForContact(params.recordID)` (line 121) → `src/services/addressLabelService.ts:95-104`.
8. `src/components/address-labels/actions.ts:42-97` — `filterAndTransform(rows, config)`: applies skip rules (opt-out, no address, no postal code, no barcode), deduplicates households when `addressMode === 'household'`, sorts by `postalCode`.

**Side effects:**
- MP API calls: one `POST /procs/api_Common_GetSelection` per selection fetch; `ceil(contactIds.length / 100)` calls to `GET /tables/Contacts` with FK-joined select.
- No DB writes.

**Error paths:**
- No session → `Error('Unauthorized')` at `src/components/address-labels/actions.ts:30`.
- Invalid `Contact_ID` in batch → `validatePositiveInt` throws at `src/services/addressLabelService.ts:76` (selection mode only; single-record mode at line 95 does not validate).
- MP failure → `HttpClient.get` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:32`; propagates through service and action; unhandled on server (becomes `Error` in client action response).

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
2. `src/contexts/user-context.tsx:22` — `authClient.useSession()` (reactive subscription to JWT cookie cache).
3. `src/contexts/user-context.tsx:29` — derive `userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid`.
4. `src/contexts/user-context.tsx:51-58` — `useEffect` fires when `!isPending && userGuid`: calls `loadUserProfile()` (line 53).
5. `src/contexts/user-context.tsx:31-49` — `loadUserProfile` sets `isLoading=true`, calls `getCurrentUserProfile(userGuid)` (line 41).
6. `src/components/shared-actions/user.ts:8` — server action `getCurrentUserProfile(id)`.
7. `src/components/shared-actions/user.ts:9-10` — `auth.api.getSession({ headers: await headers() })`; throws `'Unauthorized'` if no `session.user.id`.
8. `src/components/shared-actions/user.ts:12-13` — `UserService.getInstance()` → `userService.getUserProfile(id)`.
9. `src/services/userService.ts:81-110` — runs 3 MP queries:
   - `mp.getTableRecords('dp_Users', { filter: "User_GUID = '<guid>'", select: "User_ID, User_GUID, Contact_ID_TABLE.First_Name, ..., Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID", top: 1 })` at lines 82-87.
   - `Promise.all([dp_User_Roles fetch, dp_User_User_Groups fetch])` at lines 92-103, keyed by the numeric `User_ID` from the first query.
10. `src/services/userService.ts:105-109` — returns `{ ...profile, roles: string[], userGroups: string[] }`.
11. `src/contexts/user-context.tsx:42` — `setUserProfile(profile ?? null)`.

**Side effects:**
- MP API calls: 1 + 2 (parallel) `GET /tables/...` per mount (first run per fresh process triggers token fetch).
- No cookie changes (session read from JWT cache).

**Error paths:**
- Server action throws → caught at `src/contexts/user-context.tsx:43-46` → sets `error` state, `userProfile = null`.
- No `session.user.id` → `Error('Unauthorized')` at `src/components/shared-actions/user.ts:10`.
- Profile row missing → `userProfile = undefined` returned at `src/services/userService.ts:90`; normalized to `null` in context (line 42).

**Return shape:** `MPUserProfile | null` in context state (with `roles: string[]`, `userGroups: string[]`).

**Related:**
- `../contexts/user-provider.md` — hook usage, lifecycle
- `../services/user-service.md` — `getUserProfile` and `getUserIdByGuid` contracts
- `../auth/sessions.md` — why `userGuid` (additionalField) is needed instead of `user.id`

---

## Flow 6: Sign-out (OIDC logout)

**Trigger:** user clicks "Sign out" in user menu.
**Entry point:** `src/components/user-menu/user-menu.tsx:35` calls `handleSignOut()` server action.

**Stack trace:**
1. `src/components/user-menu/user-menu.tsx:30-37` — `handleItemClick('signout')` → `await handleSignOut()`.
2. `src/components/user-menu/actions.ts:7` — `handleSignOut` (`'use server'`).
3. `src/components/user-menu/actions.ts:9-11` — `auth.api.signOut({ headers: await headers() })` — clears Better Auth JWT cookie (via `nextCookies()` plugin at `src/lib/auth.ts:113`).
4. `src/components/user-menu/actions.ts:13-15` — read `MINISTRY_PLATFORM_BASE_URL`; throw `'MINISTRY_PLATFORM_BASE_URL is not configured'` if missing.
5. `src/components/user-menu/actions.ts:18-22` — build `${baseUrl}/oauth/connect/endsession?post_logout_redirect_uri=${APP_URL}`.
6. `src/components/user-menu/actions.ts:23` — `redirect(...)` (Next.js server redirect).
7. Browser follows to MP endsession URL; MP clears its session and 302s back to `APP_URL`.
8. Subsequent request → proxy (`src/proxy.ts:24`) sees no cookie → redirects to `/signin` (see Flow 1).

**Side effects:**
- Cookie cleared: Better Auth session cookie (`better-auth.session_token`, set via `nextCookies()` plugin).
- HTTP 302 to MP `/oauth/connect/endsession?post_logout_redirect_uri=<APP_URL>`.
- **Note:** no `id_token_hint` is sent (verified by reading action — `post_logout_redirect_uri` is the only query param, `src/components/user-menu/actions.ts:19-21`).

**Error paths:**
- `MINISTRY_PLATFORM_BASE_URL` unset → `Error('MINISTRY_PLATFORM_BASE_URL is not configured')` at `src/components/user-menu/actions.ts:15`; Better Auth cookie is already cleared at this point.
- `auth.api.signOut` failure → propagates out of action; cookie state depends on Better Auth implementation.

**Return shape:** `never` (always redirects or throws).

**Related:**
- `../components/user-menu.md` — user-menu component
- `../auth/oauth-flow.md` — sign-out section
- `../auth/sessions.md` — what `auth.api.signOut` clears

---

## Flow 7: Record create (group create)

**Trigger:** user completes the Group Wizard and clicks "Submit" on the final step.
**Entry point:** `src/app/(web)/tools/groupwizard/group-wizard.tsx:121` (`handleSubmit`) → server action `createGroup`.

**Stack trace:**
1. `src/app/(web)/tools/groupwizard/group-wizard.tsx:121-129` — `handleSubmit` calls `updateGroup(params.recordID, data)` in edit mode (line 126) or `createGroup(data)` in create mode (line 128).
2. `src/components/group-wizard/actions.ts:65` — `createGroup(data)` server action.
3. `src/components/group-wizard/actions.ts:69` — `getSession()` (helper at lines 17-21); throws `'Unauthorized'` if no `session.user.id`.
4. `src/components/group-wizard/actions.ts:70` — `getMPUserId(session)` (helper at lines 23-29) → reads `userGuid` → `UserService.getUserIdByGuid(userGuid)` → throws `'User not found'` if missing (`src/services/userService.ts:76`).
5. `src/components/group-wizard/actions.ts:71-72` — `GroupService.getInstance()` → `service.createGroup(data, userId)`.
6. `src/services/groupService.ts:227-237` — `createGroup`:
   - `prepareForApi(data)` (line 231, defined at line 18) — coerces dates, maps form fields to MP columns.
   - `mp.createTableRecords('Groups', [apiData], { $select: 'Group_ID, Group_Name', $userId: userId })` (line 232).
7. `src/lib/providers/ministry-platform/helper.ts:171-213` — `MPHelper.createTableRecords`:
   - If `schema` provided (not in this flow), runs `schema.parse(record)` per record (lines 185-197); throws `'Validation failed for record <i>: ...'` on failure.
   - `provider.createTableRecords(table, validatedRecords, providerParams)` (line 202).
8. `MinistryPlatformProvider` → `TableService.createTableRecords` → `HttpClient.post('/tables/Groups', [apiData], { $select: ..., $userId: ... })`.
9. Returns array of created records; action unwraps `result[0]` at `src/services/groupService.ts:236`.
10. `src/components/group-wizard/actions.ts:73` — returns `{ success: true, groupId, groupName }`.
11. Back on client (`src/app/(web)/tools/groupwizard/group-wizard.tsx:131-134`): on success, sets `submitResult`; on failure, `setLoadError(result.error)`.

**Side effects:**
- MP API call: `POST /tables/Groups` with `$userId=<mp user id>` → MP writes one row to `Groups` table (`Group_ID` auto-generated).
- DB write: `Groups` row (and any FK constraints MP enforces, e.g. `Group_Type_ID`).
- **No Zod validation** is currently wired for `createGroup` (the `GroupService.createGroup` call does not pass a `schema`) — schema validation only runs when callers opt in per helper contract at `src/lib/providers/ministry-platform/helper.ts:183`.

**Error paths:**
- Unauthorized / missing userGuid / user not found → thrown at `src/components/group-wizard/actions.ts:19`, `:25`, or `src/services/userService.ts:76`; caught at `src/components/group-wizard/actions.ts:74-76` and returned as `{ success: false, error }`.
- MP HTTP failure → `HttpClient.post` throws at `src/lib/providers/ministry-platform/utils/http-client.ts:59`; propagates to action catch block → `{ success: false, error: <message> }`.
- Zod validation (when enabled by caller) → `Error('Validation failed for record <i>: ...')` at `src/lib/providers/ministry-platform/helper.ts:189-196`, prior to any HTTP call.

**Return shape:** `CreateGroupResult | ActionError` from `./types` — on success `{ success: true, groupId: number, groupName: string }`.

**Related:**
- `../services/group-service.md` — `GroupService.createGroup` + `prepareForApi`
- `../components/group-wizard.md` — wizard steps and form
- `../mp-provider/services/table.md` — `createTableRecords` path
- `../services/query-patterns.md` — Zod schema opt-in pattern

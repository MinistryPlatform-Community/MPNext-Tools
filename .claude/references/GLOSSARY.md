---
title: Glossary
type: glossary
last_updated: 2026-04-17
---

# Glossary

Agent-facing domain ontology for MPNext-Tools. Terms are alphabetized. Aliases appear in the header. Definitions are one line each — follow the **See:** link for full context.

## @ / $

## @DomainID (aliases: DomainID parameter)

SQL-side convention: every `api_*` stored procedure MUST declare `@DomainID INT` as its first parameter; the MP REST API injects the authenticated domain automatically so TypeScript callers never pass it.

**Not to be confused with:** `$userId` (app-side audit param) or `Domain_ID` (FK column value).
**Defined in:** `.claude/commands/newstoredproc.md:171`
**See:** `mp-schema/required-procs.md`

## $userId (aliases: MP audit user ID)

Option passed to `MPHelper.createTableRecords` / `updateTableRecords` that stamps MP audit columns with an MP `User_ID`; resolve from `session.user.userGuid` via `UserService.getUserIdByGuid`.

**Not to be confused with:** `session.user.id` (Better Auth internal nanoid) or `userGuid` (MP User_GUID).
**Defined in:** `src/services/groupService.ts:232`
**See:** `services/README.md`

## A

## ambiguous column

MP REST error raised when a column name appears in multiple tables joined by `_TABLE` FK traversal; resolved by prefixing with `TableName.Column` or `FKColumn_TABLE.Column`.

**Not to be confused with:** SQL ambiguous-column errors (different error surface).
**Defined in:** `src/services/addressLabelService.ts:28`
**See:** `services/query-patterns.md`

## api_dev_ prefix (aliases: dev procedure, DEV_PROC_PREFIX)

Procedures whose name starts with `api_dev_` (case-insensitive, trailing underscore required) are routed through an isolated dev-credential HttpClient; `api_developer_*` does NOT match.

**Not to be confused with:** regular `api_*` procs (default credential pipeline).
**Defined in:** `src/lib/providers/ministry-platform/services/procedure.service.ts:6`
**See:** `mp-provider/services/procedure.md`

## AuthWrapper

Server component that runs inside the `(web)` route group, calls `auth.api.getSession()`, and redirects unauthenticated users to `/signin?callbackUrl=<x-pathname>`; layer-2 session validation complementing the proxy's layer-1 cookie check.

**Not to be confused with:** `proxy` (edge-layer cookie check only).
**Defined in:** `src/components/layout/auth-wrapper.tsx:5`
**See:** `auth/route-protection.md`

## Avery 5160 (aliases: 5160)

30-labels-per-sheet Avery stock (3 cols x 10 rows) on US Letter, 189pt x 72pt per label; the default `stockId` in the Address Labels UI.

**Not to be confused with:** Avery 5161 / 5163 (other stocks in `LABEL_STOCKS`).
**Defined in:** `src/lib/label-stock.ts:25`
**See:** `utils/label-stock.md`

## C

## callbackUrl

Query-string parameter on `/signin` that captures the originally requested URL; preserved across the OAuth redirect so the user lands back on the exact tool + params after sign-in.

**Not to be confused with:** `post_logout_redirect_uri` (endsession flow).
**Defined in:** `src/proxy.ts:29`
**See:** `routing/proxy.md`

## client credentials flow (aliases: OAuth2 client credentials, machine-to-machine auth)

OAuth2 grant type used by the provider to acquire tokens for server-to-MP calls via `POST {baseUrl}/oauth/connect/token` with `grant_type=client_credentials`; distinct from the Better Auth user-login OAuth flow.

**Not to be confused with:** `genericOAuth` (user-facing OIDC authorization code flow).
**Defined in:** `src/lib/providers/ministry-platform/auth/client-credentials.ts:3`
**See:** `mp-provider/client.md`

## cookieCache (aliases: JWT cookie cache)

Better Auth stateless session strategy: 1-hour TTL JWT stored in a cookie with no database — subsequent `getSession()` calls decode the cookie directly.

**Not to be confused with:** server-side session storage (not used here).
**Defined in:** `src/lib/auth.ts:12`
**See:** `auth/sessions.md`

## CredentialProfile (aliases: default, dev)

Union type `'default' | 'dev'` selecting which pair of env vars supplies the client id/secret; `'dev'` is used only by `ProcedureService` when executing `api_dev_*` stored procedures.

**Not to be confused with:** Better Auth's OAuth `providerId`.
**Defined in:** `src/lib/providers/ministry-platform/auth/client-credentials.ts:1`
**See:** `mp-provider/client.md`

## customSession (aliases: customSession plugin, customSessionClient)

Better Auth plugin wrapping the server `auth` config that enriches every `getSession()` response; here it performs name-splitting only (no API calls). Client-side `customSessionClient<typeof auth>()` provides type inference but does NOT expose `additionalFields`.

**Not to be confused with:** `UserProvider` (loads the full MP profile).
**Defined in:** `src/lib/auth.ts:97`
**See:** `auth/sessions.md`

## D

## DevPanel (aliases: dev-panel, dev overlay)

Localhost-only developer overlay rendered by `ToolContainer` when params are present; gated on `mounted` + `NODE_ENV === 'development'` + hostname in `{localhost, 127.0.0.1}`.

**Not to be confused with:** production diagnostic panels (none ship to prod).
**Defined in:** `src/components/dev-panel/dev-panel.tsx:44`
**See:** `components/dev-panel.md`

## DTO (aliases: ViewModel, Data Transfer Object)

Hand-written TypeScript interface/type shaping data between layers (e.g. `LabelData`); distinct from auto-generated MP model types in `src/lib/providers/ministry-platform/models/`.

**Not to be confused with:** MP model types (generated from DBMS).
**Defined in:** `src/lib/dto/address-label.dto.ts`
**See:** `dto-constants/dtos.md`

## E

## endsession (aliases: RP-initiated logout, OIDC endsession)

MP OAuth endpoint at `/oauth/connect/endsession` that ends the SSO session and redirects to a pre-registered `post_logout_redirect_uri`.

**Not to be confused with:** Better Auth's local `signOut` (only clears the BA cookie).
**Defined in:** `src/components/user-menu/actions.ts:18`
**See:** `components/user-menu.md`

## escapeFilterString (aliases: MP filter quote escape)

Helper that escapes `'` -> `''`, `%` -> `[%]`, `_` -> `[_]` before interpolating user input into an MP `$filter` string; used by `GroupService.searchContacts`/`searchGroups`.

**Not to be confused with:** plain quote-doubling (insufficient — misses wildcards).
**Defined in:** `src/lib/validation.ts:25`
**See:** `services/query-patterns.md`

## G

## genericOAuth (aliases: generic OAuth plugin)

Better Auth plugin wiring arbitrary OIDC providers; configured with `providerId: "ministry-platform"`, OIDC discovery URL, `offline_access` + MP all scope, `pkce: false`, and `realm=realm` authorization param. Callback URL: `/api/auth/oauth2/callback/{providerId}`.

**Not to be confused with:** `client credentials flow` (server-to-server, no user).
**Defined in:** `src/lib/auth.ts:32`
**See:** `auth/oauth-flow.md`

## GrapesJS (aliases: grapesjs, @grapesjs/react)

Client-only drag-and-drop visual editor used for the template editor; wrapped via `next/dynamic` with `ssr: false`.

**Not to be confused with:** MJML (the markup GrapesJS edits).
**Defined in:** `src/components/template-editor/editor-canvas.tsx:4`
**See:** `components/template-editor.md`

## H

## HttpClient

Low-level fetch wrapper for the provider stack; injects `Authorization: Bearer <token>` via closure, serializes JSON or FormData, URL-encodes query params, throws formatted `Error`s on non-2xx.

**Not to be confused with:** `MinistryPlatformClient` (token lifecycle owner).
**Defined in:** `src/lib/providers/ministry-platform/utils/http-client.ts:4`
**See:** `mp-provider/client.md`

## I

## IMb (aliases: Intelligent Mail Barcode, USPS-B-3200)

USPS 65-bar, 4-state (T/D/A/F) mail barcode encoding a 20-digit tracking block + optional 5/9/11-digit routing code; encoded by the hand-rolled `imbEncode()`.

**Not to be confused with:** POSTNET (legacy tall/short barcode).
**Defined in:** `src/lib/imb-encoder.ts:14`
**See:** `utils/barcodes.md`

## L

## LabelConfig

Label-generation configuration object: `stockId`, `addressMode`, `startPosition`, `includeMissingBarcodes`, `barcodeFormat`, `mailerId`, `serviceType`. Persisted to localStorage.

**Not to be confused with:** `LabelStockConfig` (physical label-sheet dimensions).
**Defined in:** `src/lib/dto/address-label.dto.ts:34`
**See:** `dto-constants/dtos.md`

## LabelData

UI-layer label view model (camelCase) produced by transforming `ContactAddressRow` in address-label server actions.

**Not to be confused with:** `ContactAddressRow` (MP REST-shaped, snake_case).
**Defined in:** `src/lib/dto/address-label.dto.ts:1`
**See:** `dto-constants/dtos.md`

## M

## Mail merge tab (aliases: MailMergeTab)

Secondary tab in `/tools/addresslabels` that lets the user upload a `.docx` template with `{Name}`/`{AddressLine1}`/`{City}`/`{%Barcode}` merge tokens and produce merged output with one page per address.

**Not to be confused with:** the Labels tab (PDF sheet generation).
**Defined in:** `src/components/address-labels/mail-merge-tab.tsx:56`
**See:** `components/address-labels.md`

## Mailer ID (aliases: MID, USPS Mailer ID)

USPS-assigned 6- or 9-digit identifier embedded in the IMb tracking block; the serial-number length is derived from Mailer ID length (9 vs 6 digits).

**Not to be confused with:** Service Type ID (3-digit IMb field).
**Defined in:** `src/lib/barcode-helpers.ts:21`
**See:** `utils/barcodes.md`

## MinistryPlatformClient

Token-lifecycle + HttpClient holder; owns two independent pipelines (default + dev) each with its own token cache, `expiresAt`, and `HttpClient`.

**Not to be confused with:** `HttpClient` (low-level fetch wrapper).
**Defined in:** `src/lib/providers/ministry-platform/client.ts:21`
**See:** `mp-provider/client.md`

## MinistryPlatformProvider (aliases: provider singleton)

Process-singleton orchestrator that owns one `MinistryPlatformClient` and six domain services; created once via `getInstance()`; every `MPHelper` instance resolves to the same provider.

**Not to be confused with:** `MPHelper` (public facade).
**Defined in:** `src/lib/providers/ministry-platform/provider.ts:44`
**See:** `mp-provider/architecture.md`

## MJML

Responsive-email markup language; source is edited in GrapesJS and server-compiled to HTML via the `mjml` package in `compileMjml`.

**Not to be confused with:** GrapesJS (the editor that emits MJML).
**Defined in:** `src/components/template-editor/actions.ts:22`
**See:** `components/template-editor.md`

## mock class (aliases: class mock)

Pattern of mocking a constructable import as a `class { method = mockFn }` literal rather than `vi.fn().mockImplementation()`; required for `MPHelper`.

**Not to be confused with:** plain `vi.fn()` mocks (don't satisfy `new`).
**Defined in:** `src/services/toolService.test.ts:11`
**See:** `testing/mocks.md`

## MPHelper

Public-API facade class for Ministry Platform operations; normalizes friendly param names (`select`, `filter`, `top`) to `$`-prefixed OData params, offers optional Zod validation on create/update, and delegates to the singleton `MinistryPlatformProvider`.

**Not to be confused with:** `MinistryPlatformProvider` (singleton internal).
**Defined in:** `src/lib/providers/ministry-platform/helper.ts:34`
**See:** `mp-provider/README.md`

## MPUserProfile

Enriched client-side user profile combining `dp_Users` row + joined Contact fields + `roles[]` + `userGroups[]`; loaded via `UserService.getUserProfile(userGuid)` and cached in `UserContext`.

**Not to be confused with:** Better Auth `session.user` (name/email/id only).
**Defined in:** `src/lib/providers/ministry-platform/types/user-profile.types.ts:1`
**See:** `contexts/user-provider.md`

## P

## Page field (aliases: dp_Page_Fields row, PageField)

Row describing how one column is presented on an MP page: order, group, required, hidden, label, default value, filter clause, depends-on field, and writing-assistant flag.

**Not to be confused with:** MP table column / schema metadata.
**Defined in:** `src/components/field-management/types.ts:9`
**See:** `components/field-management.md`

## PageData

TS interface describing the first-result-set row returned by `api_Tools_GetPageData`: `Page_ID`, `Display_Name`, `Singular_Name`, `Table_Name`, `Primary_Key`, and optional tool-config fields.

**Not to be confused with:** `PageListItem` (list view) or `PageField` (per-field metadata).
**Defined in:** `src/lib/tool-params.ts:3`
**See:** `utils/tool-params.md`

## parseToolParams (aliases: ToolParams)

Single ingestion point for Ministry Platform tool URL query strings (`pageID`, `s`, `sc`, `p`, `q`, `v`, `recordID`, `recordDescription`, `addl`); hydrates `pageData` and returns a typed `ToolParams`.

**Not to be confused with:** framework `searchParams` (raw Next.js input).
**Defined in:** `src/lib/tool-params.ts:30`
**See:** `utils/tool-params.md`

## POSTNET

Legacy USPS tall/short barcode for 5/9/11-digit ZIPs with Mod-10 check digit; used as IMb fallback when Mailer ID is absent or IMb encoding throws.

**Not to be confused with:** IMb (modern 4-state replacement).
**Defined in:** `src/lib/postnet-encoder.ts:11`
**See:** `utils/barcodes.md`

## proxy (aliases: proxy.ts, middleware (old name))

Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()`; here it performs a session-cookie-presence check via `getSessionCookie()` (no JWT decode) and forwards `pathname + search` as the `x-pathname` header.

**Not to be confused with:** `AuthWrapper` (server-component layer-2 check).
**Defined in:** `src/proxy.ts:4`
**See:** `routing/proxy.md`

## R

## route group (aliases: (web), parens group)

Next.js App Router convention: a directory wrapped in parentheses groups routes under a shared layout without contributing a URL segment; used here as `src/app/(web)/` to apply `AuthWrapper`.

**Not to be confused with:** URL path segments (parenthesised names never appear in URLs).
**Defined in:** `src/app/(web)/layout.tsx`
**See:** `routing/app-router.md`

## S

## Selection (aliases: MP Selection)

Ministry Platform user-scoped record set (identified by `Selection_ID` + `User_ID` + `Page_ID`) fetched via `api_Common_GetSelection`; the "selected records" context passed to cloud tools.

**Not to be confused with:** browser text selection or client-side state.
**Defined in:** `src/services/toolService.ts:152`
**See:** `mp-schema/required-procs.md`

## service singleton (aliases: getInstance pattern, lazy async singleton)

Application service class with private constructor and static `getInstance(): Promise<T>` that lazily constructs and initializes a single shared instance holding an `MPHelper`; reset in tests via `(ServiceClass as any).instance = undefined`.

**Not to be confused with:** `MinistryPlatformProvider` singleton (provider stack internal).
**Defined in:** `src/services/toolService.ts:81`
**See:** `services/README.md`

## shadcn/ui (aliases: shadcn)

Component primitive library installed via the shadcn CLI using `new-york` style, `slate` base color, CSS variables, and lucide icons; configured at `components.json`.

**Not to be confused with:** Radix UI primitives (the underlying layer).
**Defined in:** `components.json:1`
**See:** `components/ui.md`

## singleton reset (aliases: instance reset)

Test pattern: set `(ServiceClass as any).instance = undefined` inside `beforeEach` to clear cached service singletons between tests.

**Not to be confused with:** `vi.resetModules()` (full module-cache clear).
**Defined in:** `src/services/toolService.test.ts:22`
**See:** `testing/mocks.md`

## SkipRecord

Record of a contact excluded from label printing; shape `{ name, contactId, reason }` where `reason` is the `SkipReason` union (`'no_address' | 'no_postal_code' | 'opted_out' | 'no_barcode' | 'no_household'`).

**Not to be confused with:** `LabelData` (printable rows).
**Defined in:** `src/lib/dto/address-label.dto.ts:17`
**See:** `dto-constants/dtos.md`

## T

## _TABLE traversal (aliases: FK traversal, implicit join)

MP REST convention for following a foreign key: suffix the FK column with `_TABLE` then dot-access a field; chain with `_TABLE_` between levels with a dot only before the final field (e.g. `Household_ID_TABLE_Address_ID_TABLE.Postal_Code`).

**Not to be confused with:** `$expand` (OData-style; not used here).
**Defined in:** `src/services/addressLabelService.ts:31`
**See:** `services/query-patterns.md`

## TOKEN_LIFE (aliases: 5-minute token buffer)

Constant `5 * 60 * 1000` (ms); `MinistryPlatformClient` refreshes after this hard-coded 5-minute window for safety, ignoring MP's `expires_in`.

**Not to be confused with:** `cookieCache.maxAge` (Better Auth 1-hour JWT).
**Defined in:** `src/lib/providers/ministry-platform/client.ts:6`
**See:** `mp-provider/client.md`

## ToolContainer

Client-side full-screen flex shell that composes `DevPanel` (conditional), `ToolHeader`, a scrollable body, and `ToolFooter` for every tool page.

**Not to be confused with:** `(web)` layout (upstream `AuthWrapper` mount).
**Defined in:** `src/components/tool/tool-container.tsx:22`
**See:** `components/tool-framework.md`

## U

## useAppSession

Thin React hook that returns only the `data` portion of Better Auth's `authClient.useSession()`; the preferred client-side session accessor (drops `isPending`/`error`/`refetch`).

**Not to be confused with:** `useUser` (loads full MP profile from UserContext).
**Defined in:** `src/contexts/session-context.tsx:7`
**See:** `contexts/session.md`

## userGuid (aliases: User_GUID, MP User GUID)

MP Ministry Platform `User_GUID` (UUID) stored on `session.user` via Better Auth `additionalFields` and populated from the OIDC `sub` claim by `mapProfileToUser`; REQUIRED for every MP API lookup of the signed-in user — `session.user.id` is a Better Auth internal nanoid and is NOT interchangeable.

**Not to be confused with:** `session.user.id` (BA nanoid) or `User_ID` (MP int surrogate).
**Defined in:** `src/lib/auth.ts:24`
**See:** `auth/user-identity.md`

## UserProvider

Client React provider mounted in `src/app/providers.tsx` that watches the Better Auth session and loads `MPUserProfile` via `getCurrentUserProfile` whenever `userGuid` is present.

**Not to be confused with:** `customSession` (server-side session enrichment only).
**Defined in:** `src/contexts/user-context.tsx:21`
**See:** `contexts/user-provider.md`

## V

## validateColumnName

Throws if the input does not match `/^[A-Za-z_][A-Za-z0-9_]*$/`; used before interpolating column names into selects.

**Not to be confused with:** `escapeFilterString` (value escaping, not identifier validation).
**Defined in:** `src/lib/validation.ts:18`
**See:** `dto-constants/constants.md`

## validateGuid

Throws on malformed GUID (accepts upper/lower hex); used before interpolating `User_GUID` into MP filters.

**Not to be confused with:** runtime Zod schema validation.
**Defined in:** `src/lib/validation.ts:4`
**See:** `dto-constants/constants.md`

## validatePositiveInt

Throws on non-integer, zero, or negative input; strictly positive (`>= 1`).

**Not to be confused with:** non-negative integer checks (this rejects `0`).
**Defined in:** `src/lib/validation.ts:11`
**See:** `dto-constants/constants.md`

## vi.hoisted

Vitest helper that declares variables which must exist before `vi.mock()` factories run; required whenever a mock variable is referenced inside a `vi.mock()` factory.

**Not to be confused with:** `vi.mocked()` (type helper for already-mocked modules).
**Defined in:** `src/services/toolService.test.ts:4`
**See:** `testing/mocks.md`

## W

## WIZARD_STEPS

`as const` tuple of 6 group-wizard steps (Identity, Organization, Meeting, Attributes, Settings, Review); indexed by `WizardStepIndex` (`0`-`5`).

**Not to be confused with:** per-step schema constants (co-located with each step).
**Defined in:** `src/components/group-wizard/types.ts:51`
**See:** `components/group-wizard.md`

## X

## x-pathname

Request header set by `src/proxy.ts` on passthrough responses; carries `pathname + search` so downstream server components (notably `AuthWrapper`) can build a correct `callbackUrl`.

**Not to be confused with:** `NextRequest.nextUrl.pathname` (available only in the proxy layer).
**Defined in:** `src/proxy.ts:13`
**See:** `routing/proxy.md`

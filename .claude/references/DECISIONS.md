---
title: Architectural Decisions
type: adr
last_updated: 2026-04-17
---

# Architectural Decisions

Architectural decisions captured by the context-engineering review at SHA `971c40b`. Each ADR describes why a design choice was made and what alternatives were rejected. Grouped by domain.

## Table of contents

### Auth
- [ADR-001: Use Better Auth (not NextAuth) for OAuth + session management](#adr-001-use-better-auth-not-nextauth-for-oauth--session-management)
- [ADR-002: Stateless JWT cookie sessions (no database adapter)](#adr-002-stateless-jwt-cookie-sessions-no-database-adapter)
- [ADR-003: `customSession` does name-splitting only; MP profile loaded on client](#adr-003-customsession-does-name-splitting-only-mp-profile-loaded-on-client)
- [ADR-004: Dual-layer route protection — edge proxy + server-component validation](#adr-004-dual-layer-route-protection--edge-proxy--server-component-validation)
- [ADR-005: Route group `(web)` for authenticated pages; `/signin` and `/api/auth` outside the group](#adr-005-route-group-web-for-authenticated-pages-signin-and-apiauth-outside-the-group)

### MP Provider
- [ADR-006: Singleton `MinistryPlatformProvider` with a shared `MinistryPlatformClient`](#adr-006-singleton-ministryplatformprovider-with-a-shared-ministryplatformclient)
- [ADR-007: Four-layer MP provider stack (helper / provider / services / client)](#adr-007-four-layer-mp-provider-stack-helper--provider--services--client)
- [ADR-008: Hard-coded 5-minute token lifetime instead of using `expires_in`](#adr-008-hard-coded-5-minute-token-lifetime-instead-of-using-expires_in)
- [ADR-009: Two isolated token pipelines (default + dev) with `api_dev_*` routing](#adr-009-two-isolated-token-pipelines-default--dev-with-api_dev_-routing)
- [ADR-010: Six domain-split services under the provider (table / procedure / file / communication / metadata / domain)](#adr-010-six-domain-split-services-under-the-provider-table--procedure--file--communication--metadata--domain)
- [ADR-011: Zod validation at `MPHelper`, not in `TableService`](#adr-011-zod-validation-at-mphelper-not-in-tableservice)
- [ADR-012: Auto-generated MP schema docs via npm scripts](#adr-012-auto-generated-mp-schema-docs-via-npm-scripts)

### Services
- [ADR-013: Async-`getInstance()` singleton pattern for app services](#adr-013-async-getinstance-singleton-pattern-for-app-services)
- [ADR-014: Server actions call service singletons, not `MPHelper` directly](#adr-014-server-actions-call-service-singletons-not-mphelper-directly)

### Contexts / DTOs
- [ADR-015: Separate session context from user context](#adr-015-separate-session-context-from-user-context)
- [ADR-016: Hand-written DTOs alongside generated MP models](#adr-016-hand-written-dtos-alongside-generated-mp-models)
- [ADR-017: SQL-safety via throwing validators in `src/lib/validation.ts`](#adr-017-sql-safety-via-throwing-validators-in-srclibvalidationts)

### UI / Components
- [ADR-018: shadcn/ui over MUI/Chakra for Tailwind v4 + RSC compatibility](#adr-018-shadcnui-over-muichakra-for-tailwind-v4--rsc-compatibility)
- [ADR-019: Named exports only across `src/components/`](#adr-019-named-exports-only-across-srccomponents)
- [ADR-020: Pre-encode barcodes server-side into `LabelData.barStates`](#adr-020-pre-encode-barcodes-server-side-into-labeldatabarstates)
- [ADR-021: Hand-rolled USPS-B-3200 IMb encoder (no third-party library)](#adr-021-hand-rolled-usps-b-3200-imb-encoder-no-third-party-library)
- [ADR-022: User-supplied Mailer ID persisted in `localStorage` (no env var)](#adr-022-user-supplied-mailer-id-persisted-in-localstorage-no-env-var)
- [ADR-023: Client-only GrapesJS via `next/dynamic(ssr: false)`](#adr-023-client-only-grapesjs-via-nextdynamicssr-false)
- [ADR-024: Unify DevPanel and Deploy Tool into a single localhost overlay](#adr-024-unify-devpanel-and-deploy-tool-into-a-single-localhost-overlay)

### Testing
- [ADR-025: Vitest (not Jest) as the test runner](#adr-025-vitest-not-jest-as-the-test-runner)
- [ADR-026: jsdom (not happy-dom) as the DOM environment](#adr-026-jsdom-not-happy-dom-as-the-dom-environment)

---

## Auth

### ADR-001: Use Better Auth (not NextAuth) for OAuth + session management

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The app authenticates users against Ministry Platform's OIDC provider, which has several non-standard traits (custom `realm` authorization param, MP-specific scope `http://www.thinkministry.com/dataplatform/scopes/all`, dedicated `/oauth/connect/userinfo` endpoint for user lookup). The auth layer must run cleanly on Next.js 16 App Router with Turbopack. `src/lib/auth.ts` still reads `NEXTAUTH_URL` / `NEXTAUTH_SECRET` as fallbacks, evidence that the codebase migrated from NextAuth.
**Decision:** Use Better Auth 1.5 (`better-auth@^1.5.5`) with the `genericOAuth` plugin, a custom `getUserInfo` that calls `/oauth/connect/userinfo`, and `mapProfileToUser` that stores the OIDC `sub` claim as a user `additionalField` named `userGuid`. Wire Next.js integration with `nextCookies()` plugin and mount `toNextJsHandler(auth)` at `/api/auth/[...all]`.
**Consequences:** Custom `getUserInfo` and `mapProfileToUser` are required for MP's OIDC quirks. `additionalFields` isn't in the `genericOAuth` option types, so a `Record<string, unknown>` cast is needed when returning from `mapProfileToUser`. First-class Next.js 16 integration keeps route handlers minimal.
**Alternatives considered:**
- **NextAuth v5** — heavier, less flexible for MP's custom OIDC details; migration evidence suggests it was the previous choice and was replaced.
- **Clerk / Auth0** — external dependency not viable for on-prem MP tenants.
- **Hand-rolled OAuth** — maintenance burden, loses battle-tested session primitives.

### ADR-002: Stateless JWT cookie sessions (no database adapter)

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The tools suite is an internal app for MP staff. Adding a dedicated Postgres/Redis instance for session storage would be operational overhead disproportionate to the feature set. `auth.api.getSession()` is called on every authenticated server-component render, so the happy path must be fast.
**Decision:** Enable `session.cookieCache` with `strategy: "jwt"` and a 1-hour `maxAge`, plus `account.storeAccountCookie: true` and `storeStateStrategy: "cookie"`. Do not configure a database adapter (`src/lib/auth.ts`).
**Consequences:** Zero infrastructure beyond env vars. `getSession()` verifies the JWT cookie without a DB roundtrip. No server-side session list, no admin revocation, no cross-device logout. Sub-1-hour cookie TTL caps how long a stolen cookie is usable; refresh-token rotation behaviour in pure-cookie mode is unverified in this repo.
**Alternatives considered:**
- **DB adapter (Postgres/SQLite via Drizzle)** — requires operating an auth DB and migration pipeline.
- **Redis adapter** — another external dependency and another ops surface.

### ADR-003: `customSession` does name-splitting only; MP profile loaded on client

**Date:** 2026-04-17
**Status:** Accepted
**Context:** A tempting design is to enrich the session object inside `customSession` with the user's full MP profile (roles, user groups, Contact_ID, Image_GUID). Every consumer would then read a single object. The downside is that `customSession` runs on every cache miss, and MP profile lookups require extra MP API calls (`dp_Users` + `dp_User_Roles` + `dp_User_User_Groups`).
**Decision:** `customSession` in `src/lib/auth.ts:97-112` does only `firstName` / `lastName` splitting from `user.name` — no API calls. MP profile loading moves to the client, behind `UserProvider` (`src/contexts/user-context.tsx`), which calls the `getCurrentUserProfile(userGuid)` server action on mount and exposes `useUser()`.
**Consequences:** `getSession()` stays cheap. Sign-in does not break when MP is down. Client components that need roles/groups must mount under `UserProvider`; every page load incurs one extra round-trip. `UserService.getUserProfile()` issues three queries (profile + roles + groups).
**Alternatives considered:**
- **Enrich in `customSession`** — would hit MP API on every JWT refresh and couple sign-in availability to MP uptime.
- **Load profile server-side in layout** — blocks TTFB on every page render.

### ADR-004: Dual-layer route protection — edge proxy + server-component validation

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Unauthenticated requests should be redirected as early and cheaply as possible, but stale/forged cookies must still be rejected before any MP API call. Better Auth's full `auth.api.getSession()` is Node-only and too heavy for the edge runtime.
**Decision:** Two-layer gate:
- **Layer 1 — edge proxy** (`src/proxy.ts`): uses `getSessionCookie()` from `better-auth/cookies` to do a cheap cookie-presence check and redirects to `/signin?callbackUrl=<fullPath>` if absent. Also sets an `x-pathname` header forwarding the original URL.
- **Layer 2 — server component** (`src/components/layout/auth-wrapper.tsx`): calls `auth.api.getSession()` inside the `(web)` route group and redirects using the forwarded `x-pathname` if the session is missing or invalid.

**Consequences:** Fast happy path at the edge; full validation before any protected render. Auth logic lives in two files that must stay in sync. Public paths (`/api/*`, `/signin`) are whitelisted in the proxy.
**Alternatives considered:**
- **Single full-validation gate in the proxy** — Better Auth's full session validation isn't cheap enough for edge and has Node-only dependencies.
- **Skip edge check entirely** — every request would render a server component just to redirect, slower and more expensive than a cookie peek.

### ADR-005: Route group `(web)` for authenticated pages; `/signin` and `/api/auth` outside the group

**Date:** 2026-04-17
**Status:** Accepted
**Context:** All authenticated pages need a shared layout with `AuthWrapper` and the client `Providers` (which mounts `UserProvider`). The sign-in page and Better Auth's catch-all handler must render without a valid session.
**Decision:** Use Next.js App Router route groups. Authenticated pages live under `src/app/(web)/` and inherit its `layout.tsx`. Public routes (`src/app/signin/`, `src/app/api/auth/[...all]/`) sit as siblings outside the group.
**Consequences:** Clean separation of public vs. authenticated surfaces. Adding a new tool is a one-directory drop under `src/app/(web)/tools/`. Easy to accidentally place a public page inside `(web)/`, so reviewers must watch for this.
**Alternatives considered:**
- **Per-page auth checks** — copy-paste prone; easy to forget on new pages.
- **Single top-level layout with conditional branch** — awkward in the App Router model and wastes a layout slot.

---

## MP Provider

### ADR-006: Singleton `MinistryPlatformProvider` with a shared `MinistryPlatformClient`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** MP OAuth tokens are expensive to obtain (one HTTP roundtrip per token refresh). If each service owned its own client, tokens would refresh out of phase and multiply OAuth traffic. All MP traffic must share a single authoritative token cache.
**Decision:** `MinistryPlatformProvider` (`src/lib/providers/ministry-platform/provider.ts`) is a classical singleton — private constructor, private static `instance`, public static `getInstance()`. Its constructor creates exactly one `MinistryPlatformClient` and injects it into all six domain services (`TableService`, `ProcedureService`, `CommunicationService`, `MetadataService`, `DomainService`, `FileService`). `MPHelper` always retrieves the singleton via `MinistryPlatformProvider.getInstance()`.
**Consequences:** Process-wide token cache. Tests must mock `MinistryPlatformProvider.getInstance` and reset singleton state between cases. No per-tenant isolation within a single process.
**Alternatives considered:**
- **Per-request client** — simpler for tests but multiplies OAuth traffic.
- **DI factory** — adds boilerplate Next.js server actions don't benefit from.
- **Module-level state** — harder to reset cleanly in tests.

### ADR-007: Four-layer MP provider stack (helper / provider / services / client)

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The MP REST API surface is wide — tables CRUD, stored procedures, file uploads, communications, schema metadata, domain filters. A single monolithic client would mix HTTP mechanics, parameter ergonomics, and validation. The reverse — exposing raw services directly to app code — would force callers to know URL shapes and auth plumbing.
**Decision:** Four layers:
1. **`MPHelper`** (`src/lib/providers/ministry-platform/helper.ts`) — public facade; friendly params, Zod validation, logging.
2. **`MinistryPlatformProvider`** (singleton) — orchestrates and delegates.
3. **Six domain services** in `src/lib/providers/ministry-platform/services/` — HTTP per MP concern.
4. **`MinistryPlatformClient` + `HttpClient`** — token lifecycle and fetch plumbing.

**Consequences:** Each layer has one responsibility; swapping transport is localized to the client/service layer; mocks are cleanly scoped per test. Adding a new endpoint touches three files (service, provider delegate, helper facade), which is modest friction. Small operations require three hops.
**Alternatives considered:**
- **Flat `MPHelper`** with all HTTP inline — loses singleton benefits and per-domain modularity.
- **DI services** — Next.js server actions don't want runtime container setup.
- **Direct fetch in services** — loses token caching and central auth.

### ADR-008: Hard-coded 5-minute token lifetime instead of using `expires_in`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** MP's OAuth server returns `expires_in: 3600` (1 hour), but tokens have been observed to become invalid earlier — server restarts, credential rotations, and other backend events invalidate tokens without client notice. Trusting `expires_in` causes 401 storms.
**Decision:** Ignore `expires_in`. `TOKEN_LIFE = 5 * 60 * 1000` is hard-coded in `src/lib/providers/ministry-platform/client.ts:6` and used for both `expiresAt` and `devExpiresAt`. `ensureValidToken()` refreshes whenever `expiresAt < Date.now()`, so at most one 5-minute window is stale.
**Consequences:** Predictable refresh cadence; worst-case staleness is 5 minutes. OAuth traffic is ~12× per hour per process vs. once. No automatic recovery for sub-5-minute invalidations (no retry-on-401).
**Alternatives considered:**
- **Use `expires_in` minus 60-second buffer** — fragile against early invalidation by the MP backend.
- **Retry-on-401 with single refresh** — complicates error paths and risks infinite-loop bugs.
- **Heartbeat refresh** — extra cost without clear benefit.

### ADR-009: Two isolated token pipelines (default + dev) with `api_dev_*` routing

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Tools like the Deploy Tool (`DeployToolPanel` → `api_dev_DeployTool`) must run against a non-production MP credential set to avoid accidental prod mutation during local development. Mixing credentials into a single client risks state leakage between requests.
**Decision:** `MinistryPlatformClient` holds two isolated pipelines — `(token, expiresAt, httpClient)` and `(devToken, devExpiresAt, devHttpClient)`. `getClientCredentialsToken(profile: 'default' | 'dev')` selects which env-var pair to use (`MINISTRY_PLATFORM_CLIENT_ID/SECRET` vs `MINISTRY_PLATFORM_DEV_CLIENT_ID/SECRET`). `ProcedureService` routes only procedures whose name starts with `api_dev_` through the dev pipeline.
**Consequences:** Clean isolation; dev token refresh cannot touch prod token. Two `HttpClient` instances in memory is negligible. Dev env vars are optional at startup — the dev pipeline throws a clear error only when a caller actually invokes it without the vars set.
**Alternatives considered:**
- **Single pipeline with a pre-call hook swapping credentials** — easy to miss a swap-back, high blast radius.
- **Separate `MinistryPlatformClient` instances** — functionally equivalent but more wiring at the provider layer.

### ADR-010: Six domain-split services under the provider (table / procedure / file / communication / metadata / domain)

**Date:** 2026-04-17
**Status:** Accepted
**Context:** MP REST endpoints span CRUD, stored procs, file uploads, communications, metadata, and domain operations. A monolithic client would mix very different concerns and make per-domain mocking difficult.
**Decision:** Split into six single-responsibility service classes at `src/lib/providers/ministry-platform/services/` — `TableService`, `ProcedureService`, `CommunicationService`, `MetadataService`, `DomainService`, `FileService`. Each accepts the shared `MinistryPlatformClient` via constructor. `MinistryPlatformProvider` orchestrates; `MPHelper` adds ergonomics. Test files exist for each service in the same folder.
**Consequences:** Per-service test files are small and focused; each service can be mocked independently. Callers never touch services directly — they go through `MPHelper` → `MinistryPlatformProvider`.
**Alternatives considered:**
- **Single `MinistryPlatformClient` with all methods** — hard to test in isolation.
- **Facade-only without class split** — mixes HTTP for unrelated domains in one file.

### ADR-011: Zod validation at `MPHelper`, not in `TableService`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Runtime validation is cross-cutting and opt-in. Pushing Zod into `TableService` would force every caller to think about schemas and couple HTTP plumbing to validation.
**Decision:** `TableService` stays pure HTTP. `MPHelper.createTableRecords()` and `MPHelper.updateTableRecords()` accept an optional `schema?: ZodObject<ZodRawShape>` parameter (`src/lib/providers/ministry-platform/helper.ts:175,256`); if present, each record is validated via `schema.parse()` before delegation. `updateTableRecords` also accepts `partial?: boolean` (default `true`) to toggle `schema.partial()` semantics at the helper layer.
**Consequences:** Validation is opt-in; existing callers keep working. Per-record validation errors include the record index in the message for easier debugging. `TableService` stays thin.
**Alternatives considered:**
- **Validate in `TableService` directly** — couples HTTP to Zod; every call site would need a schema.
- **Validate only at server actions** — duplicates validation logic across every feature.

### ADR-012: Auto-generated MP schema docs via npm scripts

**Date:** 2026-04-17
**Status:** Accepted
**Context:** MP's database has hundreds of tables and stored procedures (current facts baseline: 603 generated model files). Hand-maintaining a catalog would drift constantly.
**Decision:** `npm run mp:generate:models` produces `src/lib/providers/ministry-platform/models/*.ts` (TypeScript + Zod) using `--clean` to wipe the directory first; `npm run mp:generate:storedprocs` produces `.claude/references/ministryplatform.storedprocs.md`. `required-stored-procs.md` is hand-written for the handful of procs the app actually invokes (facts snapshot lists 8).
**Consequences:** Schema reference docs stay in sync with MP after a regen. `required-stored-procs.md` must be manually updated whenever a service method wraps a new proc.
**Alternatives considered:**
- **Hand-maintained catalog** — untenable at MP's scale.
- **On-the-fly MP API lookup during agent work** — latency, no offline grep, and no stable reference.

---

## Services

### ADR-013: Async-`getInstance()` singleton pattern for app services

**Date:** 2026-04-17
**Status:** Accepted
**Context:** All five app services (`UserService`, `ToolService`, `AddressLabelService`, `GroupService`, `FieldManagementService`) need a single shared `MPHelper` per process. Construction is currently synchronous but `initialize()` may become async (e.g., to warm a cache). Tests must be able to reset state between cases.
**Decision:** Each service has a private constructor, a private static `instance` field, and a public static `async getInstance()` that lazily constructs and awaits `initialize()` (see `src/services/userService.ts:29-35`). Tests reset via `(Service as any).instance = undefined` in `beforeEach`.
**Consequences:** Single shared instance per process. Callers always `await` `getInstance()` even though today's `initialize()` is synchronous — future async setup won't break callers. Test isolation requires explicit reset.
**Alternatives considered:**
- **Module-level `const service = new Service()`** — loses test resettability.
- **Factory returning new instances** — wastes `MPHelper` construction and breaks the shared-provider invariant.

### ADR-014: Server actions call service singletons, not `MPHelper` directly

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Components should not know MP URL shapes, `$filter` / `$select` syntax, ambiguous-column prefixing rules, or `$userId` audit wiring. Concentrating these concerns keeps query conventions consistent.
**Decision:** Server actions always follow: `auth.api.getSession()` → `Service.getInstance()` → `service.method()` → `MPHelper`. Services own query strings, batching, Zod schemas, and audit parameters.
**Consequences:** One place to change an ambiguous-column fix or a batching strategy. Clean test seam: per-service mocks of `MPHelper` cover most server-action tests.
**Alternatives considered:**
- **Actions call `MPHelper` directly** — duplicates query strings across features, drifts on ambiguous-column prefixes, and spreads `$userId` wiring.

---

## Contexts / DTOs

### ADR-015: Separate session context from user context

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The Better Auth session contains identity claims (`id`, `email`, `userGuid`, `firstName`, `lastName`). Downstream features need roles, user groups, `Contact_ID`, and profile image — all of which require MP API calls and should not block the auth critical path.
**Decision:** `useAppSession()` (wraps `authClient.useSession()`) exposes only the lightweight Better Auth session. A separate `UserProvider` (`src/contexts/user-context.tsx`) loads the MP profile lazily by `userGuid` via `getCurrentUserProfile()` and exposes it through `useUser()`. `Providers` (`src/app/providers.tsx`) composes them.
**Consequences:** Auth-only consumers don't pay MP API latency. MP profile loads once per session on the client; refresh is explicit via `refreshUserProfile()`. Context value and callback are memoized (`useMemo`, `useCallback`).
**Alternatives considered:**
- **Single merged provider** — couples auth availability to MP availability.
- **Load profile server-side in layout** — blocks TTFB on every page.

### ADR-016: Hand-written DTOs alongside generated MP models

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The 603 auto-generated files in `src/lib/providers/ministry-platform/models/` mirror MP DB columns (snake_case, nullable fields matching MP schema). UI layers prefer camelCase shapes that compose related data (e.g., `AddressLabelDto` packing address + contact). Regenerating models should not ripple into components.
**Decision:** Keep generated MP models as the DB-shape layer. Author application DTOs by hand — cross-feature DTOs in `src/lib/dto/` (e.g., `address-label.dto.ts`), feature-local DTOs co-located with their component folder.
**Consequences:** Pro — UI code stays in camelCase; regenerating MP models cannot break components. Con — mapping code must exist between layers.
**Alternatives considered:**
- **Use MP generated types directly in UI** — couples components to snake_case and to DB-shape changes.
- **Generate DTOs from MP schemas** — more tooling for marginal benefit.

### ADR-017: SQL-safety via throwing validators in `src/lib/validation.ts`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Service code interpolates user input into MP OData `$filter` strings (e.g., `User_GUID = '${guid}'`). MP's API accepts raw filter strings — there is no parameterized query builder. Something must prevent SQL-like injection without forcing every call site to adopt a heavyweight ORM.
**Decision:** Four throwing helpers in `src/lib/validation.ts` — `validateGuid`, `validatePositiveInt`, `validateColumnName`, `escapeFilterString`. Callers invoke them on input and interpolate the returned value. Violations throw synchronously with a clear message.
**Consequences:** Simple, testable (see `src/lib/validation.test.ts`), grep-friendly. Static types cannot enforce "this string was validated" — reviewers must spot missed validation at call sites.
**Alternatives considered:**
- **Branded/opaque types** — over-engineered for a four-helper API.
- **Full ORM or query builder** — doesn't integrate with MP's REST surface.

---

## UI / Components

### ADR-018: shadcn/ui over MUI/Chakra for Tailwind v4 + RSC compatibility

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Tool pages need customizable primitives that render cleanly with Tailwind v4 tokens and play well with React Server Components. MUI/Chakra ship runtime CSS-in-JS that conflicts with Tailwind v4 and adds SSR friction.
**Decision:** Install shadcn/ui primitives into `src/components/ui/` via the CLI (new-york style, slate base colour, CSS variables, lucide icons). Radix UI primitives underlie interactive components. 22 UI component files live in the repo.
**Consequences:** UI primitives live locally in the repo and can be edited freely — no framework upgrade cycle. Tailwind utilities flow through. Owning the primitives means owning their maintenance.
**Alternatives considered:**
- **MUI / Chakra** — runtime CSS conflicts with Tailwind v4.
- **Raw Radix UI** — no default styling; reinvents shadcn.

### ADR-019: Named exports only across `src/components/`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** Mixed default/named exports make refactors noisy (grep misses rename targets), barrel exports inconsistent, and imports unpredictable.
**Decision:** Every component file uses named exports. Feature folders expose an `index.ts` barrel. Default exports are forbidden in components. Documented in `CLAUDE.md` "Key Development Practices" and "Code Style".
**Consequences:** Predictable imports, grep-friendly renames. Contributors occasionally need to convert shadcn CLI output or third-party examples from default to named exports.
**Alternatives considered:**
- **Default exports for top-level page components** — creates inconsistency and makes barrel composition messier.

### ADR-020: Pre-encode barcodes server-side into `LabelData.barStates`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** IMb and POSTNET encoding require check-digit and CRC math. Running the encoder inside a PDF renderer couples `@react-pdf/renderer` to encoder state. The Word mail-merge path needs the same encoded string — encoding twice duplicates work and risks drift.
**Decision:** `preEncodeBarcodes()` runs inside the address-labels server action (`src/components/address-labels/actions.ts`) and stores the result on `LabelData.barStates` plus a `barType` discriminator. Both the PDF renderer and the Word document consume the pre-encoded string.
**Consequences:** Barcode logic is isolated and unit-testable (`src/lib/barcode-helpers.test.ts`, `src/lib/imb-encoder.test.ts`, `src/lib/postnet-encoder.test.ts`). Both renderers accept the same string format.
**Alternatives considered:**
- **Encode inside each renderer** — duplicated code; drift risk.
- **Encode client-side** — no Node Buffer; Mailer ID handling more awkward.

### ADR-021: Hand-rolled USPS-B-3200 IMb encoder (no third-party library)

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The app needs to print USPS Intelligent Mail barcodes on PDF labels and inside Word mail merges. JS IMb libraries are uncommon; those that exist tend to be GPL-licensed or unmaintained.
**Decision:** Implement IMb end-to-end in `src/lib/imb-encoder.ts` — precomputed 5-of-13 / 2-of-13 tables, CRC-11 with polynomial `0x0F35`, mixed-radix codeword decomposition, and the `BAR_TABLE` per USPS-B-3200. Verified against the spec's worked example.
**Consequences:** Full control, no licensing friction, ~400 lines with unit-test coverage. The team owns a non-trivial spec implementation.
**Alternatives considered:**
- **Adopt a JS IMb library** — licensing concerns and maintenance risk.
- **Server-side CLI tool** — deployment complexity.
- **Third-party barcode service** — latency and external dependency.

### ADR-022: User-supplied Mailer ID persisted in `localStorage` (no env var)

**Date:** 2026-04-17
**Status:** Accepted
**Context:** USPS Mailer IDs are issued per mailer, not per deployment. Different users of the same MP tenant may have different Mailer IDs, and some churches may not have one at all.
**Decision:** `LabelConfig.mailerId` is a form field defaulting to `''`, persisted client-side in `localStorage` key `address-labels-config`. `preEncodeBarcodes()` falls back to POSTNET when the Mailer ID is missing or invalid.
**Consequences:** No server-side env var required; each user configures their own. IMb generation silently drops to POSTNET until a valid ID is entered.
**Alternatives considered:**
- **Environment variable** — doesn't scale to per-user mailer IDs.
- **MP custom field** — overkill for a client-side-only concern.

### ADR-023: Client-only GrapesJS via `next/dynamic(ssr: false)`

**Date:** 2026-04-17
**Status:** Accepted
**Context:** GrapesJS and `@grapesjs/react` depend on DOM globals and cannot run under Node SSR.
**Decision:** `src/components/template-editor/template-editor-form.tsx:12` wraps the editor canvas in `next/dynamic(..., { ssr: false })` with a `Skeleton` fallback. All editor files carry `"use client"`.
**Consequences:** No SSR for the template editor; initial paint shows a skeleton and hydrates. The rest of the `/tools` route stays server-rendered.
**Alternatives considered:**
- **Conditional import inside `useEffect`** — harder to type and loses Next.js loading states.

### ADR-024: Unify DevPanel and Deploy Tool into a single localhost overlay

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The dev-params overlay and the deploy-tool affordance previously existed as separate overlays. Both shared the same gating (localhost + `NODE_ENV === "development"`), and the deploy tool was only useful when the current tool was not yet authorized for the user.
**Decision:** Merge into one collapsible overlay in `src/components/dev-panel/dev-panel.tsx`. A single `DevPanel` component composes sub-panels (`ParamsPanel`, `SelectionPanel`, `ContactRecordsPanel`, `UserToolsPanel`, `DeployToolPanel`). `DeployToolPanel` renders conditionally based on the authorization result from `UserToolsPanel`. A successful deploy bumps `userToolsRefreshKey` to re-run authorization.
**Consequences:** Single collapsible bar reduces visual clutter. State coupling is centralized in `DevPanel`. Adds dependency on `NEXT_PUBLIC_PROD_URL` for the deploy panel.
**Alternatives considered:**
- **Keep two overlays separate** — duplicated gating logic and uncoordinated authorization state.

---

## Testing

### ADR-025: Vitest (not Jest) as the test runner

**Date:** 2026-04-17
**Status:** Accepted
**Context:** The project needs a TypeScript-first test runner that supports `import.meta`, runs fast against ESM without a transform step, and shares the `@/` alias configuration with Vite/Turbopack.
**Decision:** Vitest 4.x with `@vitejs/plugin-react` (`vitest.config.ts`). `globals: true` so tests use bare `describe` / `it` / `expect`. The `@/` alias is resolved via `path.resolve(__dirname, './src')`.
**Consequences:** All mock patterns assume `vi.mock()` hoisting (`vi.hoisted()` is required for any variable referenced inside a mock factory). No Jest-specific matchers — only `@testing-library/jest-dom` matchers. Shared resolver config with the bundler.
**Alternatives considered:**
- **Jest with `ts-jest` / `@swc/jest`** — transform overhead and a second resolver config to maintain.

### ADR-026: jsdom (not happy-dom) as the DOM environment

**Date:** 2026-04-17
**Status:** Accepted
**Context:** React component tests need a DOM that supports `localStorage`, `window.location`, `Headers`, and the full `@testing-library` API surface.
**Decision:** `environment: 'jsdom'` in `vitest.config.ts` with `jsdom@^28.1.0`.
**Consequences:** Slightly slower than happy-dom on pure-DOM tests, but compatibility is higher for edge APIs (`Headers`, `Storage`, `fetch` mocks).
**Alternatives considered:**
- **happy-dom** — faster, but historically has gaps around `Headers`, `fetch`, and `Storage` mocks that affect MP client tests.

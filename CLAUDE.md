# CLAUDE.md - MPNext Tools Development Guide

This guide provides essential information for AI assistants (like Claude) working on the MPNext Tools project.

## Commands

- **Dev**: `npm run dev` (Next.js dev server)
- **Build**: `npm run build` (builds SQL install script, then production build with Turbopack + type checking)
- **Lint**: `npm run lint` (ESLint CLI — `next lint` was removed in Next.js 16)
- **Generate MP Types**: `npm run mp:generate:models` (generates TypeScript types + Zod schemas from Ministry Platform API, cleans output directory first)
- **Generate MP Stored Procs**: `npm run mp:generate:storedprocs` (generates stored procedure reference from Ministry Platform API)
- **Build MP SQL Install**: `npm run mp:build:install` (combines SQL files from `db/` into unified `_INSTALL/ministryplatform-install.sql`, skips if unchanged)
- **Tests**: `npm test` (Vitest in watch mode), `npm run test:run` (single run), `npm run test:coverage` (with coverage)
- **Setup**: `npm run setup` (interactive project setup wizard), `npm run setup:check` (validate setup without changes)

### Type Generation Notes

- Generated types automatically quote field names with special characters (e.g., `"Allow_Check-in"`)
- The `mp:generate:models` script uses `--clean` flag to remove old files before regenerating
- Manual generation with options: `tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --help`

## Branching & Release

This repo uses a two-trunk flow. **`dev` is the default branch** — branch from it, PR back into it.

```
feature/fix branch  --(squash PR)-->  dev  --(merge PR + tag)-->  main
                                    staging              production
```

- **`dev`** — integration + staging verification. Default base for every new branch and PR.
- **`main`** — production. Only ever receives `dev` via a release PR. Never branch features off `main`.

### Rules

1. **Always branch from `dev`**, not `main`: `git switch dev && git pull && git switch -c feat/my-thing`
2. **PRs target `dev`** by default (`gh pr create` picks this up automatically — `dev` is the repo default branch). Only a release PR uses `--base main`.
3. **Feature → `dev` is squash-merged** — one clean commit per change. Merged branches auto-delete.
4. **`dev` → `main` is a merge commit, never a squash** — squashing would permanently diverge `dev` from `main`.
5. **Both `dev` and `main` are protected**: no direct pushes, no force-pushes, no deletion, and the `test` CI job must pass. Work through PRs.
6. **Releases**: use `/release`, which promotes `dev` → `main` and tags the resulting commit on `main` (calver `vYYYY.MM.DD.HHmm`).

### Hotfixes

Production-urgent fixes still go through `dev` — branch off `dev`, PR into `dev`, then run `/release` immediately.
Only if `dev` contains unreleasable work should you branch off `main`, PR into `main`, then merge `main` back down into `dev`
to keep them from diverging.

## Architecture

- **Framework**: Next.js 16 (App Router, Turbopack) with React 19, TypeScript strict mode
- **Ministry Platform Integration**: Custom provider at `src/lib/providers/ministry-platform/` with REST API client, auth, and type-safe models
- **Auth**: Better Auth with Ministry Platform OAuth via genericOAuth plugin — see **[Auth Reference](.claude/references/auth/README.md)** for full details
  - **Key files**: `src/lib/auth.ts` (server config), `src/lib/auth-client.ts` (client), `src/proxy.ts` (route protection)
  - **Critical**: `session.user.id` is Better Auth's internal ID, NOT the MP User_GUID. Use `session.user.userGuid` for all MP API lookups.
  - **Stateless Sessions**: JWT cookie cache, no database; `customSession` does name splitting only (no API calls)
  - **Required Environment Variables**: `MINISTRY_PLATFORM_BASE_URL`, `BETTER_AUTH_URL` (or `NEXTAUTH_URL` fallback), `BETTER_AUTH_SECRET` (or `NEXTAUTH_SECRET` fallback)
- **Services Layer**: Singleton service classes in `src/services/` wrap MPHelper for domain logic (ToolService, UserService, AddressLabelService, GroupService, FieldManagementService)
- **Contexts**: React context providers in `src/contexts/` (UserProvider) composed in `src/app/providers.tsx`; `useAppSession()` wraps Better Auth's `authClient.useSession()`
- **UI**: Radix UI primitives + shadcn/ui components in `src/components/ui/`, Tailwind CSS v4
- **Validation**: Zod v4 (`zod@^4.3`) — note: different API from Zod v3 (e.g., `z.object()` vs `z.interface()`)
- **Path Alias**: `@/*` maps to `src/*`

## Next.js 16 Notes

- **Proxy (formerly Middleware)**: Route protection lives in `src/proxy.ts` with an exported `proxy()` function (not `middleware.ts`/`middleware()`)
- **Turbopack**: Default bundler for both `dev` and `build` — no `--turbopack` flag needed
- **ESLint**: Uses `eslint .` directly (not `next lint`); config is native flat config in `eslint.config.mjs`
- **Async Dynamic APIs**: `params`, `searchParams`, `cookies()`, `headers()` must always be awaited — synchronous access is removed
- **Dev output**: `next dev` outputs to `.next/dev` (not `.next`)

## Code Style

- **Imports**: Use `@/` alias for all internal imports
- **Components**: React Server Components by default, "use client" only when needed for interactivity
- **Types**: TypeScript interfaces exported from models, Zod schemas for validation
- **Naming**:
  - PascalCase for components/types
  - camelCase for functions/variables
  - kebab-case for all component files and folders
  - snake_case for Ministry Platform API fields
- **Exports**: Use named exports for all components (no default exports)
- **UI Components**: Keep in `src/components/ui/` following shadcn conventions
- **Feature Components**: Organize in kebab-case folders with index.ts barrel exports
- **Actions**:
  - Feature-specific actions: co-locate in component folder as `actions.ts`
  - Shared actions: place in `src/components/shared-actions/`
- **Ministry Platform Structure**:
  - Database models (generated): `src/lib/providers/ministry-platform/models/` - auto-generated from DBMS
  - Zod schemas (generated): `src/lib/providers/ministry-platform/models/*Schema.ts` - for optional runtime validation
  - SQL install scripts: `src/lib/providers/ministry-platform/db/` - stored procedures and DDL for MP database deployment
  - DTOs/ViewModels (hand-written): `src/lib/dto/` - application-level data transfer objects
  - Services (hand-written): `src/services/` - singleton classes wrapping MPHelper for domain operations
- **Validation**: 
  - Use optional `schema` parameter in `createTableRecords()` and `updateTableRecords()` for runtime validation before API calls
  - For updates, set `partial: false` to require all fields (default is `partial: true` for partial updates)
  - Validation errors provide detailed feedback with record index and field-level issues

## Component Organization

```
src/components/
├── address-labels/       # Address label printing & mail merge
├── dev-panel/            # Unified dev panel (localhost-only) - params, selection, contact records, user tools
├── field-management/     # Drag-and-drop MP page field order editor (PageSearch + FieldOrderEditor)
├── group-wizard/         # Multi-step group creation/edit wizard (6 steps)
├── layout/               # Layout components (AuthWrapper)
├── shared-actions/       # Shared actions used across features
├── template-editor/      # Email/document template editor (GrapesJS)
├── tool/                 # Tool framework (Container, Header, Footer)
├── ui/                   # shadcn/ui components (22)
├── user-menu/            # User dropdown with OIDC sign-out
└── feature-name/         # Feature components (kebab-case)
    ├── feature-name.tsx
    ├── actions.ts        # Feature-specific server actions
    └── index.ts          # Barrel exports
```

## Data Flow

Server actions in `actions.ts` should call **service classes** (not MPHelper directly):

```
Component → Server Action → Service (singleton) → MPHelper → Ministry Platform API
```

## Import Patterns

```typescript
// Layout components (using barrel export)
import { AuthWrapper } from '@/components/layout';

// Tool components (using barrel export)
import { ToolContainer, ToolHeader, ToolFooter } from '@/components/tool';

// Service classes (used in server actions)
import { ToolService } from '@/services/toolService';
import { UserService } from '@/services/userService';
import { AddressLabelService } from '@/services/addressLabelService';
import { GroupService } from '@/services/groupService';

// React contexts
import { UserProvider, useUser, useAppSession } from '@/contexts';

// Better Auth (server-side)
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
const session = await auth.api.getSession({ headers: await headers() });

// Better Auth (client-side)
import { authClient } from '@/lib/auth-client';
const { data: session, isPending } = authClient.useSession();

// Ministry Platform models (generated)
import { Congregation } from '@/lib/providers/ministry-platform/models';

// Ministry Platform Zod schemas (for runtime validation)
import { ContactLogSchema } from '@/lib/providers/ministry-platform/models';

// Ministry Platform helper (used by services, not directly by components)
import { MPHelper } from '@/lib/providers/ministry-platform';

// Feature-specific actions (relative path within same folder)
import { myAction } from './actions';

// Shared actions (used across multiple features)
import { getCurrentUserProfile } from '@/components/shared-actions/user';

// Named exports (required)
export function MyComponent() { ... }  // ✅ Correct
export default MyComponent;            // ❌ Avoid
```

## Key Development Practices

1. **Always use the `@/` path alias** for imports instead of relative paths
2. **Prefer Server Components** - only use "use client" when absolutely necessary
3. **Follow naming conventions strictly** - kebab-case for files/folders, PascalCase for components
4. **Use named exports** - no default exports
5. **Co-locate feature code** - keep actions.ts with their related components
6. **Never manually edit generated files** - regenerate types using `npm run mp:generate:models`
7. **Use TypeScript strict mode** - all code must be type-safe
8. **Validate at API boundaries** - use Zod schemas with the `schema` parameter in `createTableRecords()` and `updateTableRecords()` for runtime validation
9. **Use service classes in server actions** - call services from `src/services/`, not MPHelper directly from components or actions
10. **Disambiguate ambiguous columns** - when querying tables with FK joins, prefix columns that exist in multiple tables (e.g., `Contacts.Contact_ID` not just `Contact_ID`). Use `FKColumn_TABLE.Column` to traverse foreign keys (e.g., `Contact_ID_TABLE.First_Name`). For multi-level FK traversal, chain with `_TABLE_` underscores and use a dot only before the final field (e.g., `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID`). See **[Services query-patterns](.claude/references/services/query-patterns.md)** for full rules and examples.
11. **Escape user input in filters** - always escape single quotes: `term.replace(/'/g, "''")`
12. **Authorize, don't just authenticate** — feature server actions **and** service methods that touch MP data call `AuthorizationService` (`requireSecurityRole`, for **reads** as well as writes), never a bare `auth.api.getSession()` check. MP's OIDC endpoint authenticates *any* `dp_Users` record, and this app reads MP with its own service account, so MP's per-user record security never applies to what it returns — "a session exists" proves nothing. Documented carve-outs, each justified in-file: `layout/auth-wrapper.tsx` (it *is* the session gate), `shared-actions/user.ts` (the user's own profile), `shared-actions/domain.ts` (one domain-wide config string), `dev-panel/panels/require-dev-session.ts` (dev-only, and the services it calls gate anyway). A fifth needs the same justification, in the file, in writing.
13. **Write attribution has exactly one source** — `$userId` comes from the gate's return value, assembled in the **service**, never passed in by an action and never read from a caller-supplied payload. Two layers stamping it can drift, and a caller value can slip past whichever was checked second.
14. **No debug logging in `src/`** — `no-console` is enforced by ESLint (`warn`/`error` only). Errors log **identifiers and shape** (table, IDs, HTTP status), never record content, `$filter` strings, request bodies, or response bodies — including inside thrown error messages, which travel further than logs do.
15. **`src/lib/tool-params.ts` must stay client-safe** — it is imported by client components. Importing a service from it drags `next/headers` into the client graph and fails the Turbopack build. Server-side parsing lives in `tool-params.server.ts`; a dynamic `import()` is *not* sufficient, it still creates a graph edge.
16. **Convert all date/time values at the MP boundary** - use `DomainTimezoneService` (never raw `new Date(x).toISOString()`, `` `${date}T00:00:00Z` ``, or `getFullYear()`) when sending or receiving datetime fields, since MP stores wall-clock values in the domain's time zone, not UTC. See **[Date/Time Handling Reference](.claude/references/ministryplatform.datetimehandling.md)**.

## Validation Best Practices

When working with Ministry Platform data:

```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';
import { ContactLogSchema } from '@/lib/providers/ministry-platform/models';

const mp = new MPHelper();

// ✅ Good: Validate data before creating records
await mp.createTableRecords('Contact_Log', records, {
  schema: ContactLogSchema,
  $userId: currentUser.Contact_ID
});

// ✅ Good: Partial validation for updates (default)
await mp.updateTableRecords('Contact_Log', partialRecords, {
  schema: ContactLogSchema,
  partial: true, // default, allows partial updates
  $userId: currentUser.Contact_ID
});

// ✅ Good: Strict validation for full record updates
await mp.updateTableRecords('Contact_Log', fullRecords, {
  schema: ContactLogSchema,
  partial: false, // require all fields
  $userId: currentUser.Contact_ID
});

// ⚠️ Acceptable: Skip validation (backward compatible)
await mp.createTableRecords('Contact_Log', records, {
  $userId: currentUser.Contact_ID
});
```

## Testing

- **Framework**: Vitest with jsdom environment, `@testing-library/react` + `@testing-library/user-event` for hooks/components, v8 coverage
- **Counts**: test/file totals live in `.claude/references/_meta/facts/` (bit-rots quickly — trust `vitest run` output over any doc claim)
- **Coverage is enforced**: `vitest.config.mts` sets `thresholds: { statements: 97, lines: 98 }`, checked by the existing `test:coverage` CI job. Branches/functions are deliberately unenforced. Raise the thresholds as coverage rises; never lower them to green a red build.
- **`coverage.include` is load-bearing**: without `include: ['src/**/*.{ts,tsx}']` the v8 provider reports only files a test imported, so untested files vanish instead of counting as 0%. Two traps: `coverage.all` was **removed in Vitest 5** (setting it is a type error and does nothing), and directory exclusions must end in `**` — a bare `'src/components/ui/'` matches nothing.
- **Config**: `vitest.config.ts` (runner), `src/test-setup.ts` (env vars + jest-dom)
- **jest-dom import**: `src/test-setup.ts` must import `@testing-library/jest-dom/vitest`, **not** the bare `@testing-library/jest-dom`. Since jest-dom v7 only the `/vitest` entry augments Vitest's `expect` types; the bare import registers matchers at runtime, so tests pass while `next build` fails with `Property 'toBeInTheDocument' does not exist`.
- **Co-location**: Test files live next to source — `foo.ts` → `foo.test.ts`
- **Critical**: Use `vi.hoisted()` for any mock variables referenced inside `vi.mock()` factories (hoisting causes `ReferenceError` otherwise)
- **MPHelper mock**: Use mock class (`MPHelper: class { method = mockFn; }`), not `vi.fn().mockImplementation()`
- **Singleton reset**: Reset `(ServiceClass as any).instance = undefined` in `beforeEach` to prevent state leakage
- **Server action tests**: Mock `@/lib/auth` (`auth.api.getSession`), `next/headers` (`headers()`), and service singletons
- **Type-check locally before pushing**: CI does not run `tsc`, and `tsconfig.json` includes `**/*.ts`/`**/*.tsx`, so a type error in a *test* file breaks `npm run build` while CI stays green. This has happened — see `.claude/TODO/2026-09-13-testing-no-typecheck-gate-in-ci.md`.
- See **[Testing Reference](.claude/references/testing/README.md)** for all mock patterns, coverage data, and test inventory

## Dependencies

Run an audit with **`/update-deps`** (`.claude/commands/update-deps.md`). It applies
in-range updates, evaluates each major separately, sweeps OSV.dev for advisories
`npm audit` does not carry, and writes a record to `.claude/packages/`.

**Before upgrading anything, read the newest file in [`.claude/packages/`](.claude/packages/)** —
its "Held back" section records what is already known to be blocked and the exact
condition that clears it. Do not re-derive that analysis.

- **Node**: pinned to the **Node 24 LTS line** — `engines.node` is `^24.15.0`
  (the `24.15` floor is jsdom 30's, the strictest dev dependency). `@types/node`
  is pinned to the matching major (`^24.13.4`); do not let it drift ahead of the
  runtime. `.nvmrc` holds `24` and CI reads it via `node-version-file`.
  **Vercel** deploys the latest `24.x` for this range (it only offers majors:
  24.x/22.x/20.x), so `engines.node` overrides whatever the project's
  Build & Deployment setting says. Node 20 and 22 are no longer supported here.
  **Hold this pin until Vercel's default Node version moves forward** — re-check
  with <https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>,
  then bump `engines.node`, `.nvmrc`, `@types/node`, and `REQUIRED_NODE_MAJOR`
  in `scripts/setup.ts` together.
- **CI gates tests only** — `.github/workflows/test.yml` runs `npm run test:coverage`
  and never `npm run build`, so type errors do not fail CI. Type-check locally.
- **Coverage path is load-bearing**: CI uploads `coverage/coverage-final.json` to
  Codecov. Verify that exact path still exists after any Vitest major.

### Dependency Audit History

| Date | Advisories | Highlights | Record |
|---|---|---|---|
| 2026-09-13 | 14 → **0** | `next` 16.2.10 → 16.3.5 (**critical** RCE on Windows hosts, proxy bypass, SSRF). Adopted Vitest 5, jsdom 30, jest-dom 7, chalk 6. Dropped 5 unreferenced deps. Held TS 7, ESLint 10, GrapesJS 0.23. | [2026-09-13](.claude/packages/2026-09-13.md) |

### Current holds

| Package | Blocked by | Re-check with |
|---|---|---|
| `typescript` 7 | No stable Compiler API until 7.1; `typescript-eslint` peers `typescript: >=4.8.4 <6.1.0` | `npm view typescript-eslint peerDependencies` |
| `eslint` 10 | `eslint-plugin-react@7.37.5` (latest) peers `eslint ^9.7` and calls a removed context method | `npm view eslint-plugin-react peerDependencies` |
| `grapesjs` 0.23 | `@grapesjs/react@2.0.0` (latest) peers `grapesjs ^0.22.5` | `npm view @grapesjs/react peerDependencies` |
| `@types/node` 25+ | Runtime is pinned to Node 24 (`engines.node: ^24.15.0`) because 24.x is Vercel's current default/newest offering; types must not lead the runtime | Vercel's [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) |

## Reference Documents

Agent-facing reference docs are hierarchical under `.claude/references/`. Start with the index:

- **[Reference Index](.claude/references/INDEX.md)** — top-level navigation: "for question X, read Y"
- **[GLOSSARY](.claude/references/GLOSSARY.md)** — domain terms (alphabetized)
- **[DECISIONS](.claude/references/DECISIONS.md)** — architectural decisions (ADRs)
- **[GOTCHAS](.claude/references/GOTCHAS.md)** — known traps (symptom-first)
- **[Ministry Platform Date/Time Handling](.claude/references/ministryplatform.datetimehandling.md)** — How to send/receive MP datetimes safely via `DomainTimezoneService`, anti-patterns, Windows↔IANA mapping, and test guidance

### Domain subfolders

| Domain | Entry point |
|---|---|
| auth | [`.claude/references/auth/README.md`](.claude/references/auth/README.md) |
| mp-provider | [`.claude/references/mp-provider/README.md`](.claude/references/mp-provider/README.md) |
| mp-schema (generated) | [`.claude/references/mp-schema/README.md`](.claude/references/mp-schema/README.md) |
| services | [`.claude/references/services/README.md`](.claude/references/services/README.md) |
| components | [`.claude/references/components/README.md`](.claude/references/components/README.md) |
| contexts | [`.claude/references/contexts/README.md`](.claude/references/contexts/README.md) |
| routing | [`.claude/references/routing/README.md`](.claude/references/routing/README.md) |
| data-flow | [`.claude/references/data-flow/README.md`](.claude/references/data-flow/README.md) |
| testing | [`.claude/references/testing/README.md`](.claude/references/testing/README.md) |
| security | [`.claude/references/security/README.md`](.claude/references/security/README.md) |
| dto-constants | [`.claude/references/dto-constants/README.md`](.claude/references/dto-constants/README.md) |
| utils | [`.claude/references/utils/README.md`](.claude/references/utils/README.md) |

### Open TODOs

- **[TODO Index](.claude/TODO/INDEX.md)** — all known issues by severity and tag
- **[TODO Schema](.claude/TODO/SCHEMA.md)** — required format for new TODO files

### Meta

- [`.claude/references/_meta/conventions.md`](.claude/references/_meta/conventions.md) — writing rules
- [`.claude/references/_meta/verification-rules.md`](.claude/references/_meta/verification-rules.md) — how to verify claims

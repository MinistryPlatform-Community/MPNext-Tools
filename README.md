# MPNext-Tools

[![Release](https://img.shields.io/github/v/release/MinistryPlatform-Community/MPNext-Tools?logo=github)](https://github.com/MinistryPlatform-Community/MPNext-Tools/releases/latest)
[![Tests](https://github.com/MinistryPlatform-Community/MPNext-Tools/actions/workflows/test.yml/badge.svg)](https://github.com/MinistryPlatform-Community/MPNext-Tools/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/MinistryPlatform-Community/MPNext-Tools/graph/badge.svg)](https://codecov.io/gh/MinistryPlatform-Community/MPNext-Tools)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-new--york-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-primitives-161618?logo=radixui&logoColor=white)](https://www.radix-ui.com/)
[![Lucide](https://img.shields.io/badge/Lucide-icons-F56565?logo=lucide&logoColor=white)](https://lucide.dev/)

A Ministry Platform page tools application powered by Next.js 16, React 19, Better Auth, and a Ministry Platform REST API integration with TypeScript and Zod validation.

MPNext-Tools is a **template**: churches fork or copy it and run their own instance. If you run a copy, read [`.github/SECURITY.md`](.github/SECURITY.md) — fixes made here do not reach your fork automatically.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Quick Setup](#quick-setup)
  - [Manual Setup](#manual-setup)
  - [OAuth Client Setup](#oauth-client-setup)
  - [Production Deployment](#production-deployment)
- [Project Structure](#project-structure)
- [Tools](#tools)
- [Ministry Platform Integration](#ministry-platform-integration)
- [Components](#components)
- [Services](#services)
- [Testing](#testing)
- [Development](#development)
- [Claude Code Commands](#claude-code-commands)
- [Documentation](#documentation)
- [Code Style & Conventions](#code-style--conventions)
- [Security](#security)

## Features

- **Authentication**: Better Auth with Ministry Platform OAuth/OIDC (genericOAuth plugin), stateless encrypted-cookie sessions, and OIDC RP-initiated logout
- **Authorization**: every MP read and write is gated by MP security role (`MP_SECURITY_ROLES`, fails closed); users without an allowed role land on `/no-access`
- **Tools Framework**: reusable components for building Ministry Platform page tools, with URL parameter parsing and create/edit dual mode
- **Address Labels**: print labels with USPS Intelligent Mail Barcodes (IMb), POSTNET fallback, and Word document mail merge
- **Group Wizard**: six-step create/edit wizard for MP `Groups` records
- **Field Management**: drag-and-drop editor for MP page field order, groups and per-field flags
- **Add/Edit Family**: household editor with contact search, address autocomplete (Google Places) and envelope numbering
- **Type-Safe API**: TypeScript strict mode with model and Zod v4 schema files generated from your MP instance
- **Security hardening**: nonce-based CSP, security headers, boot-time refusal of weak secrets and malformed URLs, sign-in rate limiting
- **Testing**: Vitest 5 suite with enforced coverage thresholds (see [Testing](#testing))
- **Setup Wizard**: interactive CLI for environment configuration, dependency install, type generation and build verification

## Architecture

### Framework

- **Next.js 16** with App Router and Turbopack (default bundler for dev and build)
- **React 19** with Server Components by default
- **TypeScript 6.0** in strict mode
- **Tailwind CSS v4** with the `@tailwindcss/postcss` plugin
- **Zod v4** for runtime validation
- **Vitest 5** with jsdom and v8 coverage

### Ministry Platform Integration

Custom provider at `src/lib/providers/ministry-platform/` with a layered architecture:

```
MPHelper (Public API Facade)
  -> MinistryPlatformProvider (Singleton Orchestrator)
    -> MinistryPlatformClient (HTTP + OAuth2 Token Management)
      -> Six Specialized Services
        -> HttpClient (Raw HTTP with Bearer Auth)
```

- REST API client using OAuth2 client credentials; the token is re-fetched every 5 minutes, well inside its 1-hour lifetime
- Type-safe models and Zod validation schemas generated from the MP schema
- Six services: Table, Procedure, Communication, File, Metadata, Domain

### Authentication & Authorization

Better Auth with Ministry Platform OAuth via the genericOAuth plugin (`src/lib/auth.ts`):

- **One MP API client** (`MINISTRY_PLATFORM_CLIENT_ID`) serves as both the server-side service account and the sign-in client
- **Stateless sessions** (no database): hard 12-hour lifetime, encrypted (JWE) cookie cache, no user OAuth tokens stored, and boot-time refusal of a weak/missing `BETTER_AUTH_SECRET` or malformed base URLs
- **OIDC RP-initiated logout** for proper MP session termination
- **Layered protection**:
  1. `src/proxy.ts` — session-cookie check on every non-public route (plus the CSP nonce)
  2. `AuthWrapper` — server-side session validation; redirects to `/signin`, or to `/session-error` for a session with no `userGuid`
  3. `requireToolAccess()` — every tool page checks the caller's MP security role before parsing params or loading data
  4. `AuthorizationService.requireSecurityRole()` — every server action and service method that touches MP data, reads included
- **Client-side profile**: `UserProvider` loads the signed-in user's display profile (name, nickname, email)
- **Critical**: `session.user.id` is Better Auth's internal ID. Use `session.user.userGuid` for all MP lookups.

### Data Flow

```
Component -> Server Action -> Service (singleton) -> MPHelper -> Ministry Platform API
```

## Prerequisites

- **Node.js**: **v24.15.0 or later on the 24.x line** (pinned via `engines.node` in `package.json`, `.nvmrc`, and the setup script). Node 24 is the current LTS and the version Vercel deploys; 20.x and 22.x are not supported. Use `nvm use` (or `fnm use`) to pick it up from `.nvmrc`.
- **Package Manager**: npm
- **Ministry Platform**: active instance with an API client configured (see [OAuth Client Setup](#oauth-client-setup))
- **Ministry Platform Database**: SQL install script applied (see [Database Setup](#database-setup))

### Database Setup

The repo ships a bundled SQL install script at `_INSTALL/ministryplatform-install.sql`. It contains the stored procedures and DDL several tools depend on (for example, Field Management requires `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, and `api_MPNextTools_UpdatePageFieldOrder`).

Deploy it once per Ministry Platform database (and again whenever the SQL bundle changes):

1. Open SQL Server Management Studio (SSMS) and connect to the MP database
2. Open `_INSTALL/ministryplatform-install.sql`
3. Execute the script against the MP database

The script is regenerated automatically as part of `npm run build` (via the same script as `npm run mp:build:install`), bundling everything under `src/lib/providers/ministry-platform/db/` into the single install file.

## Getting Started

### Quick Setup

The interactive setup wizard automates the configuration:

```bash
git clone <repository-url>
cd MPNext-Tools
npm install
npm run setup
```

The setup wizard will:
1. Verify the Node.js version (24.x, at least 24.15.0)
2. Detect the project origin (template clone → convert to a fork or reinitialize git)
3. Check git status
4. Create `.env.local` from `.env.example` (if needed)
5. Validate environment variables — prompts for the MP host (deriving `MINISTRY_PLATFORM_BASE_URL` and `NEXT_PUBLIC_MINISTRY_PLATFORM_FILE_URL`), the API client ID/secret, and `MP_SECURITY_ROLES`, and auto-generates `BETTER_AUTH_SECRET`
6. Run `npm install`
7. Run `npm update`
8. Regenerate Ministry Platform types against your MP instance
9. Generate the stored procedure reference (powers Claude Code suggestions)
10. Run a production build to verify configuration

When the wizard finishes it prints a reminder pointing to `_INSTALL/ministryplatform-install.sql` so you can deploy the SQL prerequisites to your MP database.

**Additional setup options:**
```bash
npm run setup:check            # Validation only (no changes)
npm run setup -- --clean       # Clean install (delete node_modules first)
npm run setup -- --skip-install # Skip npm install/update
npm run setup -- --verbose     # Extra output
npm run setup -- --help        # Show all options
```

Once setup completes, run `npm run dev` and visit http://localhost:3000.

---

### Manual Setup

#### 1. Clone and Install

```bash
git clone <repository-url>
cd MPNext-Tools
npm install
```

`npm install` also runs the `prepare` script, which points git at `.githooks/` — its pre-commit hook refuses to commit any `.env*` file other than `.env.example`.

#### 2. Environment Configuration

```bash
cp .env.example .env.local
```

Set the required variables in `.env.local`. `.env.example` documents every variable inline.

```env
# Generate with: openssl rand -base64 32 (at least 32 characters)
BETTER_AUTH_SECRET=your_generated_secret

# An origin only; https:// for every real host (http:// only for localhost)
BETTER_AUTH_URL=http://localhost:3000

# The app's one MP API client — service account AND sign-in client
MINISTRY_PLATFORM_CLIENT_ID=MPNext
MINISTRY_PLATFORM_CLIENT_SECRET=your_client_secret
MINISTRY_PLATFORM_BASE_URL=https://your-instance.ministryplatform.com/ministryplatformapi

# Who may use the tools. FAILS CLOSED: unset/blank = nobody.
# "*" = any MP security role; or a comma list, e.g. Administrators,Staff
MP_SECURITY_ROLES=*
```

**The app refuses to start** (including `next build`) when `BETTER_AUTH_SECRET` is missing, shorter than 32 characters or Better Auth's public default; when `BETTER_AUTH_SECRETS` is set; or when a base URL is malformed or non-https. `NEXTAUTH_SECRET` / `NEXTAUTH_URL` are accepted as fallbacks for migrations from NextAuth.

**Optional environment variables:**

| Variable | Purpose |
|----------|---------|
| `MINISTRY_PLATFORM_DEV_CLIENT_ID` / `_SECRET` | Dev/staging-only MP API client, used only to run `api_dev_*` procedures from the dev panel's Deploy Tool. Ignored in production builds. |
| `GOOGLE_PLACES_API_KEY` | Address autocomplete in Add/Edit Family. The MP `dp_Configuration_Settings` value (`COMMON` / `GoogleMapsAPIKey`) wins; this variable is the fallback. Neither set = plain text input. |
| `NEXT_PUBLIC_MINISTRY_PLATFORM_FILE_URL` | MP file URL — derived from the MP host by the setup wizard; also allowed by the CSP. |
| `NEXT_PUBLIC_PROD_URL` | Production URL used by the dev panel's Authorized Tools check. |
| `CSP_ENFORCE` | The CSP is enforced by default; only the exact string `false` switches to report-only. |
| `CSP_REPORT_URI` | Optional https:// CSP violation collector. |
| `AUTH_IP_ADDRESS_HEADERS` | Client-IP header(s) for sign-in rate limiting. Default on Vercel: `x-vercel-forwarded-for,x-real-ip`. |
| `AUTH_TRUSTED_PROXIES` | Proxy IPs/CIDRs to skip when walking an appended `X-Forwarded-For` chain. |

#### 3. Regenerate Ministry Platform Types

The repo ships pre-generated models under `src/lib/providers/ministry-platform/models/` so a fresh clone builds immediately. Regenerate them against **your own** MP instance to pick up custom tables, columns, and constraints:

```bash
npm run mp:generate:models
```

This connects to your MP API, fetches all table metadata, and regenerates TypeScript interfaces and Zod v4 schemas into `src/lib/providers/ministry-platform/models/` (the `--clean` flag removes stale files first). Run it whenever your MP schema changes.

Optionally, also refresh the stored procedure reference (used by Claude Code for query suggestions):

```bash
npm run mp:generate:storedprocs
```

See [Type Generation](#type-generation) for advanced options.

#### 4. Run the Development Server

```bash
npm run dev
```

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to Ministry Platform login
3. After signing in you'll see the dashboard with the available tools (or `/no-access` if you hold none of the roles in `MP_SECURITY_ROLES`)

---

### OAuth Client Setup

The app uses **one** MP API client for both server-side data access and user sign-in. In Ministry Platform, sign in as an administrator and go to **Administration > API Clients**.

#### Basic Settings
- **Client ID**: must match `MINISTRY_PLATFORM_CLIENT_ID`
- **Client Secret**: generate a secure secret (→ `MINISTRY_PLATFORM_CLIENT_SECRET`)
- **Display Name**: MPNext-Tools (or your preferred name)
- **Client User**: a scoped user (it is the audit-log user for writes made without a signed-in user)

#### Redirect URIs (Required)

Separate multiple entries with a semicolon (`;`). The path is `<BETTER_AUTH_URL>/api/auth/callback/ministryplatform`:

| Environment | URI |
|-------------|-----|
| Development | `http://localhost:3000/api/auth/callback/ministryplatform` |
| Production | `https://yourdomain.com/api/auth/callback/ministryplatform` |

#### Post-Logout Redirect URIs (Required)

Exactly `<BETTER_AUTH_URL>`, with no trailing slash:

| Environment | URI |
|-------------|-----|
| Development | `http://localhost:3000` |
| Production | `https://yourdomain.com` |

> Without a post-logout redirect URI, users are signed straight back in after signing out (SSO behavior).

---

### Production Deployment

1. Deploy `_INSTALL/ministryplatform-install.sql` to the production MP database (see [Database Setup](#database-setup))
2. Set every required variable in your hosting provider — including `MP_SECURITY_ROLES`, which fails closed — with `BETTER_AUTH_URL` set to your production origin (https)
3. Add the production redirect and post-logout redirect URIs to the MP API client
4. On a proxy other than Vercel, set `AUTH_IP_ADDRESS_HEADERS` (or `AUTH_TRUSTED_PROXIES`) to match it
5. Run `npm run mp:generate:models` so types match your instance
6. Test the complete sign-in, tool access and sign-out flow

## Project Structure

```
MPNext-Tools/
├── .github/
│   ├── SECURITY.md                         # Vulnerability reporting policy
│   └── workflows/test.yml                  # CI: lint, typecheck, coverage, build, prerender check
├── .githooks/pre-commit                    # Blocks staged .env* files (except .env.example)
├── _INSTALL/ministryplatform-install.sql   # Bundled MP SQL install (generated at build)
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── (web)/                          # Protected route group (AuthWrapper + Providers)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard with tool cards
│   │   │   ├── error.tsx
│   │   │   ├── no-access/                  # Users without an allowed MP security role
│   │   │   └── tools/
│   │   │       ├── layout.tsx
│   │   │       ├── require-tool-access.ts  # Per-page role gate (every tool page calls it first)
│   │   │       ├── addeditfamily/          # Add/Edit Family (UI + actions co-located here)
│   │   │       ├── addresslabels/          # Address label printing
│   │   │       ├── fieldmanagement/        # MP page field layout editor
│   │   │       ├── groupwizard/            # Group create/edit wizard
│   │   │       └── template/               # Template tool (scaffold/demo)
│   │   ├── api/auth/[...all]/              # Better Auth handler (deny-by-default route allowlist)
│   │   ├── auth-error/                     # OAuth callback failure page (public)
│   │   ├── session-error/                  # Session without userGuid; sign-out escape hatch
│   │   ├── signin/                         # OAuth sign-in page
│   │   ├── error.tsx, global-error.tsx     # Error boundaries
│   │   ├── layout.tsx                      # Root HTML layout
│   │   └── providers.tsx                   # Context providers (UserProvider)
│   │
│   ├── components/                         # See Component Organization below
│   ├── contexts/                           # user-context.tsx, use-app-session.ts, index.ts
│   │
│   ├── lib/
│   │   ├── auth.ts, auth-client.ts         # Better Auth server config / client hooks
│   │   ├── env.ts                          # Validated env access (getMpBaseUrl, getAuthBaseUrl, getMpClient)
│   │   ├── security-headers.ts             # CSP + security headers
│   │   ├── tool-params.ts                  # Client-safe tool URL param types/helpers
│   │   ├── tool-params.server.ts           # parseToolParams() (server-only)
│   │   ├── imb-encoder.ts, postnet-encoder.ts, barcode-helpers.ts, barcode-image.ts
│   │   ├── label-stock.ts                  # Label stock definitions (Avery 5160, etc.)
│   │   ├── constants.ts, utils.ts, validation.ts, zip-guard.ts
│   │   ├── dto/                            # Hand-written DTOs (address-label.dto.ts, family.ts)
│   │   └── providers/
│   │       ├── google-places/              # Google Places API client
│   │       └── ministry-platform/          # MP provider
│   │           ├── auth/                   # Client-credentials OAuth
│   │           ├── db/                     # SQL stored procedures/DDL (bundled into _INSTALL)
│   │           ├── docs/                   # Provider documentation
│   │           ├── models/                 # Generated types + Zod schemas
│   │           ├── scripts/                # Type/proc generators, SQL bundler
│   │           ├── services/               # 6 API services
│   │           ├── types/, utils/          # Type definitions, HttpClient
│   │           └── client.ts, provider.ts, helper.ts, index.ts
│   │
│   ├── services/                           # 9 application services (singletons, server-only)
│   ├── proxy.ts                            # Route protection (session cookie check + CSP nonce)
│   └── test-setup.ts                       # Vitest environment setup
│
├── scripts/
│   ├── setup.ts                            # Interactive setup wizard
│   └── check-prerender.mjs                 # Fails if a route was statically prerendered (no CSP nonce)
│
├── .claude/                                # Claude Code configuration
│   ├── commands/                           # 4 Claude Code commands
│   ├── references/                         # Agent-facing reference docs (start at INDEX.md)
│   ├── packages/                           # Dependency audit records
│   ├── playbooks/                          # Porting guides for downstream forks
│   └── TODO/                               # Known open issues
│
├── .env.example                            # Environment template (every variable documented)
├── CLAUDE.md                               # Development guide
├── vitest.config.mts                       # Vitest configuration (coverage thresholds)
├── components.json                         # shadcn/ui config (new-york style, slate theme)
├── next.config.ts                          # Next.js configuration
├── tsconfig.json                           # TypeScript strict mode, @/* alias
└── package.json                            # Dependencies and scripts
```

## Tools

The dashboard at `/` shows a card for each tool. All tools require a Ministry Platform sign-in **and** an MP security role allowed by `MP_SECURITY_ROLES`.

| Route | Tool |
|-------|------|
| `/tools/addresslabels` | Address Labels |
| `/tools/groupwizard` | Group Wizard |
| `/tools/fieldmanagement` | Field Management |
| `/tools/addeditfamily` | Add/Edit Family |
| `/tools/template` | Template (reference implementation) |

### Address Labels

**Route**: `/tools/addresslabels`

Prints address labels with USPS Intelligent Mail Barcodes (IMb) and optional Word document mail merge.

- Fetch addresses from Ministry Platform selections or the current record
- USPS Intelligent Mail Barcodes (IMb) with configurable Mailer ID, POSTNET fallback
- Print-ready label sheets (Avery 5160 and other stock formats) as PDF
- Word document mail merge with `.docx` template support
- Address validation and skip reporting

**Components** (`src/components/address-labels/`): `AddressLabelsForm`, `AddressLabelsSummary`, `LabelDocument`, `AddressLabel`, `ImbBarcode`, `PostnetBarcode`, `MailMergeTab`.

### Group Wizard

**Route**: `/tools/groupwizard`

A six-step create/edit wizard for MP `Groups` records — identity, organization, meeting, attributes, settings, review — with per-step React Hook Form + Zod validation and contact/group search comboboxes. Opened from a Groups record it edits that group; otherwise it creates one.

**Components** (`src/components/group-wizard/`): `StepIdentity`, `StepOrganization`, `StepMeeting`, `StepAttributes`, `StepSettings`, `StepReview`, `WizardStepper`, `WizardNavigation`, `ContactSearch`, `GroupSearch`.

### Field Management

**Route**: `/tools/fieldmanagement`

A drag-and-drop editor for Ministry Platform page field layout — reorder fields, assign groups, and toggle per-field flags (required, hidden, writing-assistant) without touching the MP UI.

- Searchable page picker sourced from `dp_Pages`
- Drag-and-drop reordering within and across field groups
- Inline editing for label, default value, filter clause, depends-on field, and writing-assistant toggle
- Create new groups on the fly
- Auto-merges table columns not yet present in `dp_Page_Fields`

**Components** (`src/components/field-management/`): `PageSearch`, `FieldOrderEditor`, `SortableGroup`, `SortableFieldItem`, `NewGroupDialog`, `useFieldOrderState`.

**Stored procedures**: `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder`.

### Add/Edit Family

**Route**: `/tools/addeditfamily`

A household editor: search for a contact (or open from a record), then edit the household, its address (with Google Places autocomplete when configured) and its members, and save. Assigns a unique envelope number when needed. Its UI and server actions live in the route folder, `src/app/(web)/tools/addeditfamily/`.

### Template Tool

**Route**: `/tools/template`

A reference implementation of the tool framework pattern. Use it as a starting point for new tools.

```
src/app/(web)/tools/template/
├── page.tsx           # Server component — requireToolAccess(), then parseToolParams()
├── loading.tsx        # Loading state
└── template-tool.tsx  # Client component — renders inside ToolContainer
```

### Building Custom Tools

All tools follow a consistent pattern:

1. **Server component** (`page.tsx`) calls `requireToolAccess(...)` **first**, then parses URL search params with `parseToolParams()` and fetches page metadata
2. **Client component** renders the UI inside `ToolContainer` with header/footer actions
3. **Server actions** (`actions.ts`) call service singletons, which gate every MP call with `AuthorizationService`
4. Tools receive standard MP parameters: `pageID`, `s` (selection), `sc`, `p`, `q`, `v`, `recordID`, `recordDescription`, `addl`

**Quick start** — use the Claude Code command to scaffold a new tool:
```bash
/newtool MyToolName
```

Or manually: copy the `template` folder, rename files and components, and implement your logic inside `ToolContainer`.

**URL parameter utilities**:
- `parseToolParams(searchParams)` (`src/lib/tool-params.server.ts`) — parses params and fetches page metadata
- `isNewRecord(params)` / `isEditMode(params)` (`src/lib/tool-params.ts`, client-safe) — create vs. edit mode

## Ministry Platform Integration

### MPHelper — Public API

`MPHelper` is the entry point to the MP REST API. Application code calls it from **service classes** in `src/services/`, never from components or server actions, and every call is preceded by the authorization gate:

```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';
import { ContactLogSchema } from '@/lib/providers/ministry-platform/models/ContactLogSchema';
import { AuthorizationService } from '@/services/authorizationService';
import { DomainTimezoneService } from '@/services/domainTimezoneService';

const mp = new MPHelper();
const authz = AuthorizationService.getInstance();

// Read — gated like a write
await authz.requireSecurityRole({ table: 'Contacts', operation: 'read' });
const contacts = await mp.getTableRecords({
  table: 'Contacts',
  filter: 'Contact_Status_ID=1',
  select: 'Contact_ID,Display_Name,Email_Address',
  orderBy: 'Last_Name',
  top: 50
});

// Create — $userId comes from the gate, datetimes from DomainTimezoneService.
// (No `schema` here: generated Zod schemas currently reject MP wall-clock
// datetimes — see .claude/TODO/2026-10-10-generated-zod-rejects-mp-datetimes.md)
const userId = await authz.requireSecurityRole({ table: 'Contact_Log', operation: 'create' });
await mp.createTableRecords('Contact_Log', [{
  Contact_ID: 12345,
  Contact_Date: await DomainTimezoneService.getInstance().toMpSqlDatetime(new Date()),
  Made_By: userId,
  Notes: 'Follow-up call completed'
}], {
  $userId: userId
});

// Partial update with Zod validation
await mp.updateTableRecords('Contact_Log', [{ Contact_Log_ID: 67890, Notes: 'Updated' }], {
  schema: ContactLogSchema,
  partial: true,
  $userId: userId
});

// Execute stored procedures
const results = await mp.executeProcedureWithBody('api_Custom_Procedure', {
  '@ContactID': 12345
});

// File operations
const files = await mp.getFilesByRecord({
  table: 'Contacts',
  recordId: 12345
});
```

### API Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **Table** | CRUD operations | `getTableRecords`, `createTableRecords`, `updateTableRecords`, `deleteTableRecords` |
| **Procedure** | Stored procedures | `getProcedures`, `executeProcedure`, `executeProcedureWithBody` |
| **Communication** | Email/SMS with attachments | `createCommunication`, `sendMessage` |
| **File** | File management | `getFilesByRecord`, `uploadFiles`, `updateFile`, `deleteFile`, `getFileContentByUniqueId`, `getFileMetadata` |
| **Metadata** | Schema info | `getTables`, `refreshMetadata` |
| **Domain** | Domain config | `getDomainInfo`, `getGlobalFilters` |

MPHelper also exposes `copyRecord`, `copyRecordWithSubpages` and `generateSequence`. See the [provider docs](src/lib/providers/ministry-platform/docs/README.md).

### Type Generation

```bash
# Generate all types with Zod schemas into models/ (recommended)
npm run mp:generate:models

# Generate for specific tables
npm run mp:generate -- -s "Contact"

# Generate with detailed mode (samples records for better type inference)
npm run mp:generate -- -d --sample-size 10

# See all options
npm run mp:generate -- --help
```

> **Running the generators directly?** Pass `--conditions=react-server` to `tsx` (e.g. `npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --help`). The MP client modules start with `import 'server-only'`, which throws under plain Node without that condition. The `npm run mp:generate*` scripts already include it.

**CLI Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./generated-types` |
| `-s, --search <term>` | Filter tables by name | (all tables) |
| `-z, --zod` | Generate Zod schemas | `false` |
| `-c, --clean` | Remove old files first | `false` |
| `-d, --detailed` | Sample records for type inference | `false` |
| `--sample-size <num>` | Records to sample | `5` |

**Generated output** (for `mp:generate:models`): one TypeScript interface per MP table (JSDoc, FK annotations, constraints), a matching `<Table>Schema.ts` Zod schema per table, and a barrel `index.ts` that re-exports the **types** — import a schema from its own file, e.g. `@/lib/providers/ministry-platform/models/ContactLogSchema`.

## Components

### UI Components (`src/components/ui/`)

22 shadcn/ui components built on Radix UI primitives and Tailwind CSS v4 (new-york style, slate theme, lucide icons).

### Layout & Tool Framework

- **AuthWrapper** (`layout/`) — server component; validates the session via `auth.api.getSession()`, redirects to `/signin` if unauthenticated and to `/session-error` if the session has no `userGuid`
- **ToolContainer** (`tool/`) — full-screen layout with header, scrollable content, and footer actions. Renders `DevPanel` above the title bar on localhost in development only.
- **ToolHeader** — dark slate title bar with optional info tooltip
- **ToolFooter** — Close/Save action buttons with loading state

### Feature Components

- **address-labels/** — label printing, IMb/POSTNET barcodes, PDF/DOCX output, mail merge
- **group-wizard/** — six-step group create/edit wizard
- **field-management/** — drag-and-drop MP page field order editor
- **dev-panel/** — localhost-only developer overlay: parsed URL params, MP selection data, contact records, authorized tools, deploy tool
- **shared-actions/** — cross-feature server actions: `getCurrentUserProfile()` (the *calling* user's profile; the `User_GUID` comes from the session, never a parameter), domain config, and `handleSignOut()` (app sign-out plus MP RP-initiated logout, used by the sign-out forms on `/no-access` and `/session-error`)

All components use kebab-case file names, PascalCase component names, and named exports with barrel `index.ts` files.

## Services

Application services in `src/services/` are server-only singletons that wrap MPHelper:

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **AuthorizationService** | Role gate for all MP data access (`MP_SECURITY_ROLES`, fails closed); returns the acting MP `User_ID` for write attribution | `requireSecurityRole`, `hasSecurityRole` |
| **DomainTimezoneService** | MP domain time zone and wall-clock ↔ instant conversion at the MP boundary | `getMpTimezone`, `toMpSqlDatetime`, `parseMpDatetime` |
| **ToolService** | Page metadata, selections, the user's authorized tools, dev-tool deploy | `getPageData`, `getSelectionRecordIds`, `getUserTools`, `resolveContactIds`, `listPages`, `listRoles`, `deployTool` |
| **UserService** | Signed-in user's display profile by `User_GUID` | `getUserProfile` |
| **AddressLabelService** | Mailing addresses for contacts | `getAddressesForContacts`, `getAddressForContact` |
| **GroupService** | Group Wizard lookups, search, read/create/update | `fetchAllLookups`, `searchContacts`, `searchGroups`, `getGroup`, `createGroup`, `updateGroup` |
| **FieldManagementService** | MP pages, page fields, table metadata, field-order saves | `getPages`, `getPageFields`, `getTableMetadata`, `updatePageFieldOrder` |
| **FamilyService** | Add/Edit Family: contact search, household load/save, lookups, envelope numbers | `searchContacts`, `resolveContactIdFromPage`, `getHousehold`, `getLookups`, `getDefaults`, `getNextEnvelopeNumber`, `saveHousehold` |
| **GooglePlacesService** | Address autocomplete (key from MP config, else env) | `isEnabled`, `autocomplete`, `getPlaceDetails` |

**DTOs** (`src/lib/dto/`): hand-written application types — address labels (`LabelData`, `LabelConfig`, `SkipRecord`, …) and family (`Household` and related schemas).

## Testing

- **Framework**: Vitest 5 with jsdom
- **Libraries**: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- **Coverage**: v8 provider, **enforced** thresholds (statements 97%, lines 98%) in `vitest.config.mts`
- **Co-location**: `foo.ts` → `foo.test.ts`, next to the source
- **Counts**: test totals drift quickly — trust `npm run test:run`; the latest snapshot lives in `.claude/references/_meta/facts/`

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report (what CI runs)
```

Per-file coverage and the full test inventory are in the [Testing Reference](.claude/references/testing/README.md).

**Key testing patterns**:
- **`vi.hoisted()`** for mock variables referenced inside `vi.mock()` factories
- **MPHelper mock**: use mock class syntax, not `vi.fn().mockImplementation()`
- **Singleton reset**: `(ServiceClass as any).instance = undefined` in `beforeEach`
- **Server action mocks**: mock `@/lib/auth`, `next/headers`, and service singletons
- **Fake timers**: `vi.useFakeTimers()` for token expiry testing

## Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Bundle SQL install script, then production build (with type checking)
npm start                # Start production server
npm run check:prerender  # After a build: fail if a route was statically prerendered (no CSP nonce)

# Code Quality
npm run lint             # ESLint (native flat config)
npm run typecheck        # tsc --noEmit
npm test                 # Vitest watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report

# Ministry Platform
npm run mp:generate:models      # Generate types + Zod schemas to models/ (recommended)
npm run mp:generate             # Type generator with your own flags (-- --help)
npm run mp:generate:storedprocs # Generate stored procedure reference
npm run mp:build:install        # Bundle db/ SQL into _INSTALL/ministryplatform-install.sql

# Setup
npm run setup            # Interactive setup wizard
npm run setup:check      # Validate setup without changes
```

CI (`.github/workflows/test.yml`) runs lint, typecheck, tests with coverage, the build, and the prerender check as steps of a single required `test` job.

### Branching

`dev` is the default branch: branch from it and open PRs against it (squash-merged). `main` is production and only receives `dev` through a release PR (merge commit, never squash). See [CLAUDE.md § Branching & Release](CLAUDE.md#branching--release).

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.4.0 | App Router, Turbopack, React Server Components |
| react | ^19.3.0 | UI framework |
| better-auth | ^1.7.7 | OAuth authentication with genericOAuth plugin |
| jose | ^6.2.12 | id_token (JWT) verification |
| zod | ^4.6.5 | Runtime validation (v4 API) |
| react-hook-form | ^7.89.0 | Form state management |
| tailwindcss | ^4.2.0 | Utility-first CSS |
| lucide-react | ^1.55.0 | Icon library |
| @react-pdf/renderer | ^4.9.0 | Label sheet PDFs |
| docx / docxtemplater | ^9.9.0 / ^3.71.0 | Word document output and mail merge |
| @dnd-kit/react | ^0.5.0 | Drag and drop (Field Management) |
| vitest | ^5.0.0 | Test framework |
| typescript | ^6.0.3 | Type safety |

Dependency audits and known version holds are recorded in [`.claude/packages/`](.claude/packages/).

## Claude Code Commands

This project includes 4 custom [Claude Code](https://claude.ai/code) commands in `.claude/commands/`:

| Command | Description |
|---------|-------------|
| `/newtool <name>[, <name>…]` | Scaffold one or more tools: a self-gating route page, a client component in `ToolContainer`, and a dashboard card |
| `/newstoredproc <name>` | Scaffold an `api_*` stored procedure (with `@DomainID INT` as the first parameter) and add it to the SQL install bundle |
| `/release` | Promote `dev` → `main` with a merge commit, then tag `main` with calver `vYYYY.MM.DD.HHmm` and publish a GitHub release (`--draft`, `--prerelease`, `--tag`, `--target`, `--since`) |
| `/update-deps` | Apply in-range updates, evaluate each major separately, sweep OSV.dev for advisories, and write a record to `.claude/packages/` (`--security-only`, `--check`) |

## Documentation

| Document | Description |
|----------|-------------|
| **[CLAUDE.md](CLAUDE.md)** | Development guide — commands, architecture, rules, testing patterns |
| **[Security Policy](.github/SECURITY.md)** | How to report a vulnerability; required steps for downstream forks |
| **[Reference Index](.claude/references/INDEX.md)** | Entry point to all agent-facing reference docs |
| **[Ministry Platform Provider](src/lib/providers/ministry-platform/docs/README.md)** | REST API client documentation |
| **[Type Generator](src/lib/providers/ministry-platform/scripts/README.md)** | CLI for generating TypeScript types from the MP schema |
| **[Auth Reference](.claude/references/auth/README.md)** | Better Auth config, OAuth flow, sessions, userGuid vs user.id |
| **[Security Reference](.claude/references/security/README.md)** | Authorization model, write attribution, logging rules, headers/CSP |
| **[Components Reference](.claude/references/components/README.md)** | Component inventory |
| **[Services Reference](.claude/references/services/README.md)** | Service layer, MP query patterns |
| **[Testing Reference](.claude/references/testing/README.md)** | Vitest patterns, mock setup, coverage data |
| **[Decisions](.claude/references/DECISIONS.md)** / **[Gotchas](.claude/references/GOTCHAS.md)** | Architectural decisions and known traps |
| **[MP Schema Reference](.claude/references/mp-schema/README.md)** | Generated table and stored procedure catalogs |

## Code Style & Conventions

See [CLAUDE.md](CLAUDE.md) for the full rules. The essentials:

- **`@/*` path alias** for all internal imports
- **Naming**: PascalCase for components/types, camelCase for functions/variables, kebab-case for all files and folders, snake_case for Ministry Platform API fields
- **React Server Components by default**; `"use client"` only when needed
- **Named exports only** (no default exports, except where Next.js requires them)
- **Feature folders** in kebab-case with `index.ts` barrels; server actions co-located as `actions.ts`; shared actions in `src/components/shared-actions/`
- **Server modules start with `import 'server-only'`**
- **Authorize, don't just authenticate**: MP-touching actions and service methods call `AuthorizationService.requireSecurityRole()`, reads included
- **Use `session.user.userGuid`** for MP lookups (not `session.user.id`)
- **Convert datetimes at the MP boundary** with `DomainTimezoneService`
- **Never edit generated files** in `src/lib/providers/ministry-platform/models/` — regenerate with `npm run mp:generate:models`
- Access MP fields with special characters using bracket notation: `event["Allow_Check-in"]`

## Security

Please **do not** open a public issue for a security problem. Report it privately as described in [`.github/SECURITY.md`](.github/SECURITY.md), which also lists the steps every downstream fork must take.

## License

No license has been chosen for this repository yet. Until one is added, all rights are reserved by default. (`"private": true` in `package.json` only prevents publishing to npm.)

## Support

For Ministry Platform API documentation, see your instance's API documentation portal. For bugs and feature requests, open a [GitHub issue](https://github.com/MinistryPlatform-Community/MPNext-Tools/issues).

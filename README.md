# MPNext-Tools

[![Tests](https://github.com/MinistryPlatform-Community/MPNext-Tools/actions/workflows/test.yml/badge.svg)](https://github.com/MinistryPlatform-Community/MPNext-Tools/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/MinistryPlatform-Community/MPNext-Tools/graph/badge.svg)](https://codecov.io/gh/MinistryPlatform-Community/MPNext-Tools)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A Ministry Platform page tools application powered by Next.js 16, React 19, Better Auth, and a comprehensive Ministry Platform REST API integration with TypeScript and Zod validation.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Quick Setup](#quick-setup)
  - [Manual Setup](#manual-setup)
  - [OAuth Client Setup](#oauth-client-setup)
- [Project Structure](#project-structure)
- [Tools](#tools)
  - [Address Labels](#address-labels)
  - [Template Editor](#template-editor)
  - [Template Tool](#template-tool)
  - [Building Custom Tools](#building-custom-tools)
- [Ministry Platform Integration](#ministry-platform-integration)
- [Components](#components)
- [Services](#services)
- [Testing](#testing)
- [Development](#development)
- [Claude Code Commands](#claude-code-commands)
- [Documentation](#documentation)
- [Code Style & Conventions](#code-style--conventions)

## Features

- **Authentication**: Better Auth with Ministry Platform OAuth (genericOAuth plugin), stateless JWT sessions, and OIDC RP-initiated logout
- **Tools Framework**: Reusable components for building Ministry Platform page tools with URL parameter parsing and dual-mode support (create/edit)
- **Address Labels**: Print address labels with USPS Intelligent Mail Barcodes (IMb), POSTNET fallback, and Word document mail merge
- **Template Editor**: Visual email/document template editor with GrapesJS, merge field support, and MP template integration
- **Modern UI**: 22 Radix UI + shadcn/ui components with Tailwind CSS v4
- **Type-Safe API**: Full TypeScript strict mode with 873 auto-generated model and schema files from Ministry Platform
- **REST API Client**: Six specialized services covering tables, procedures, communications, files, metadata, and domain operations
- **Type Generation**: CLI tool to generate TypeScript interfaces and Zod v4 schemas from MP database schema
- **Validation**: Optional Zod v4 runtime validation in MPHelper before API calls
- **Testing**: 241 test cases across 21 files with Vitest 4.1
- **Setup Wizard**: Interactive CLI setup with environment configuration, dependency management, and build verification

## Architecture

### Framework

- **Next.js 16** with App Router and Turbopack (default bundler for dev and build)
- **React 19** with Server Components by default
- **TypeScript 6.0** in strict mode
- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin
- **Zod v4** for runtime validation
- **Vitest 4.1** for testing with v8 coverage

### Ministry Platform Integration

Custom provider at `src/lib/providers/ministry-platform/` with a layered architecture:

```
MPHelper (Public API Facade)
  -> MinistryPlatformProvider (Singleton Orchestrator)
    -> MinistryPlatformClient (HTTP + OAuth2 Token Management)
      -> Six Specialized Services
        -> HttpClient (Raw HTTP with Bearer Auth)
```

- REST API client with automatic OAuth2 client credentials token management (5-minute refresh buffer)
- Type-safe models and Zod validation schemas (436 tables, 873 generated files)
- Six services: Table, Procedure, Communication, File, Metadata, Domain

### Authentication

Better Auth with Ministry Platform OAuth via genericOAuth plugin (`src/lib/auth.ts`):

- **Stateless JWT cookie sessions** with 1-hour cache (no database required)
- **Custom session enrichment** with name splitting via `customSession` plugin
- **OIDC RP-initiated logout** for proper MP session termination
- **Dual-layer route protection**: proxy-level cookie check (`src/proxy.ts`) + component-level session validation (`AuthWrapper`)
- **Client-side profile loading**: `UserProvider` context fetches full `MPUserProfile` (roles, groups, contact data) on mount
- **Critical**: `session.user.id` is Better Auth's internal ID. Use `session.user.userGuid` for all MP API lookups.

### Data Flow

```
Component -> Server Action -> Service (singleton) -> MPHelper -> Ministry Platform API
```

## Prerequisites

- **Node.js**: v18 or higher
- **Package Manager**: npm
- **Ministry Platform**: Active instance with API credentials and OAuth client configured

## Getting Started

### Quick Setup

The interactive setup wizard automates the entire configuration process:

```bash
git clone <repository-url>
cd MPNext-Tools
npm install
npm run setup
```

The setup wizard will:
1. Verify Node.js version (v18+ required)
2. Detect project origin and configure git
3. Create `.env.local` from `.env.example` (if needed)
4. Prompt for Ministry Platform host and derive all API URLs automatically
5. Configure OAuth client credentials
6. Auto-generate `BETTER_AUTH_SECRET`
7. Install and update dependencies
8. Generate Ministry Platform types
9. Run a production build to verify configuration

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

#### 2. Environment Configuration

```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```env
# Better Auth Configuration
OIDC_CLIENT_ID=TM.Widgets
OIDC_CLIENT_SECRET=your_client_secret

# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your_generated_secret

# Update for production
BETTER_AUTH_URL=http://localhost:3000

# Ministry Platform API Configuration
MINISTRY_PLATFORM_CLIENT_ID=MPNext
MINISTRY_PLATFORM_CLIENT_SECRET=your_client_secret
MINISTRY_PLATFORM_BASE_URL=https://your-instance.ministryplatform.com/ministryplatformapi

# Public Keys
NEXT_PUBLIC_MINISTRY_PLATFORM_FILE_URL=https://your-instance.ministryplatform.com/ministryplatformapi/files
NEXT_PUBLIC_APP_NAME=MPNext-Tools
```

#### 3. Generate Ministry Platform Types

```bash
npm run mp:generate:models
```

This connects to your Ministry Platform API, fetches all table metadata, and generates:
- TypeScript interfaces for each table
- Zod v4 validation schemas for runtime validation
- Schema documentation at `.claude/references/ministryplatform.schema.md`
- Output to `src/lib/providers/ministry-platform/models/`

**Advanced options:**
```bash
# Generate types for specific tables only
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -s "Contact"

# Generate without Zod schemas
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -o ./types

# Generate with detailed mode (samples records for better type inference)
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -d --sample-size 10

# See all options
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --help
```

#### 4. Run the Development Server

```bash
npm run dev
```

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to Ministry Platform login
3. After successful login, you'll see the dashboard with available tools

---

### OAuth Client Setup

Before running the application, configure an OAuth 2.0 / OIDC client in Ministry Platform.

Log in as an administrator and navigate to **Administration > API Clients**.

#### Basic Settings
- **Client ID**: Your client ID (must match `OIDC_CLIENT_ID` in `.env.local`)
- **Client Secret**: Generate a secure secret
- **Display Name**: MPNext-Tools (or your preferred name)
- **Client User**: Create a scoped user or use API User

#### Redirect URIs (Required)

Separate each entry with a semicolon (`;`):

| Environment | URI |
|-------------|-----|
| Development | `http://localhost:3000/api/auth/oauth2/callback/ministry-platform` |
| Production | `https://yourdomain.com/api/auth/oauth2/callback/ministry-platform` |

> The callback path uses Better Auth's genericOAuth plugin convention: `/api/auth/oauth2/callback/{providerId}`.

#### Post-Logout Redirect URIs (Required)

| Environment | URI |
|-------------|-----|
| Development | `http://localhost:3000` |
| Production | `https://yourdomain.com` |

> Post-logout redirect URIs are **required** for proper OIDC logout. Without them, users will be auto-logged back in after signing out (SSO behavior).

#### Generate Better Auth Secret

```bash
openssl rand -base64 32
```

---

### Production Deployment

1. Update `BETTER_AUTH_URL` to your production domain
2. Add production redirect and post-logout redirect URIs to Ministry Platform OAuth client
3. Ensure all environment variables are set in your hosting provider
4. Enable HTTPS/SSL certificates
5. Run `npm run mp:generate:models` to ensure types are current
6. Test the complete authentication flow

## Project Structure

```
MPNext-Tools/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (web)/                        # Protected route group (AuthWrapper + Providers)
│   │   │   ├── page.tsx                  # Dashboard with tool cards
│   │   │   ├── home/                     # Redirect to /
│   │   │   ├── tools/                    # Tools section
│   │   │   │   ├── layout.tsx            # Full-height gray background
│   │   │   │   ├── addresslabels/        # Address label printing tool
│   │   │   │   ├── template/             # Template tool (scaffold/demo)
│   │   │   │   └── templateeditor/       # Visual template editor
│   │   │   └── layout.tsx                # Auth + Providers wrapper
│   │   ├── api/auth/[...all]/            # Better Auth route handler
│   │   ├── signin/                       # OAuth sign-in page
│   │   ├── layout.tsx                    # Root HTML layout
│   │   └── providers.tsx                 # Context providers (UserProvider)
│   │
│   ├── components/                       # React components
│   │   ├── address-labels/               # Address label printing & mail merge
│   │   ├── layout/                       # AuthWrapper (server component)
│   │   ├── shared-actions/               # Cross-feature server actions
│   │   ├── template-editor/              # GrapesJS template editor
│   │   ├── tool/                         # Tool framework (Container, Header, Footer, ParamsDebug, SelectionDebug)
│   │   ├── ui/                           # 22 shadcn/ui components
│   │   ├── user-menu/                    # User dropdown with OIDC sign-out
│   │   └── user-tools-debug/             # Dev helper: authorized tool paths
│   │
│   ├── contexts/                         # React Context providers
│   │   ├── user-context.tsx              # UserProvider (MP profile + roles)
│   │   ├── session-context.tsx           # useAppSession() hook
│   │   └── index.ts
│   │
│   ├── lib/                              # Shared libraries
│   │   ├── auth.ts                       # Better Auth server config
│   │   ├── auth-client.ts                # Better Auth client hooks
│   │   ├── dto/                          # Hand-written DTOs/ViewModels
│   │   ├── tool-params.ts                # Tool URL parameter parsing
│   │   ├── utils.ts                      # Tailwind cn() utility
│   │   ├── imb-encoder.ts                # USPS Intelligent Mail barcode encoder
│   │   ├── postnet-encoder.ts            # POSTNET barcode encoder
│   │   ├── barcode-helpers.ts            # Barcode generation utilities
│   │   ├── label-stock.ts                # Label stock definitions (Avery 5160, etc.)
│   │   └── providers/
│   │       └── ministry-platform/        # Ministry Platform provider
│   │           ├── auth/                 # Client credentials OAuth
│   │           ├── services/             # 6 API services
│   │           ├── models/               # Generated types (873 files)
│   │           ├── types/                # Type definitions
│   │           ├── utils/                # HttpClient utility
│   │           ├── scripts/              # Type generation CLI
│   │           ├── docs/                 # Provider documentation
│   │           ├── client.ts             # Core MP client (token management)
│   │           ├── provider.ts           # Singleton provider
│   │           ├── helper.ts             # Public API (MPHelper)
│   │           └── index.ts              # Barrel export
│   │
│   ├── services/                         # Application services (singletons)
│   │   ├── addressLabelService.ts        # Address fetching & label data
│   │   ├── toolService.ts                # Page data and user permissions
│   │   └── userService.ts                # User profile with roles/groups
│   │
│   ├── proxy.ts                          # Route protection (session cookie check)
│   └── test-setup.ts                     # Vitest environment setup
│
├── scripts/
│   └── setup.ts                          # Interactive setup wizard
│
├── .claude/                              # Claude Code configuration
│   ├── commands/                         # 5 Claude Code skills
│   └── references/                       # 6 reference documents
│
├── .env.example                          # Environment template
├── CLAUDE.md                             # Development guide
├── vitest.config.ts                      # Vitest configuration
├── components.json                       # shadcn/ui config (new-york style, slate theme)
├── next.config.ts                        # Next.js configuration
├── tsconfig.json                         # TypeScript strict mode, @/* alias
└── package.json                          # Dependencies and scripts
```

## Tools

The application provides a dashboard at `/` with cards linking to each available tool. All tools are protected behind Ministry Platform OAuth authentication.

### Address Labels

**Route**: `/tools/addresslabels`

A tool for printing address labels with USPS Intelligent Mail Barcodes (IMb) and optional Word document mail merge.

**Features:**
- Fetch addresses from Ministry Platform selections or saved selections
- Generate USPS Intelligent Mail Barcodes (IMb) with configurable Mailer ID
- POSTNET barcode fallback for simpler addressing
- Print-ready label sheets (Avery 5160 and other stock formats)
- Word document mail merge with `.docx` template support
- Address validation and skip reporting
- Configurable label formats and barcode options

**Components** (`src/components/address-labels/`):
- `AddressLabelsForm` — Configuration form (address source, barcode format, label stock)
- `AddressLabelsSummary` — Results summary with skip reporting
- `LabelDocument` — Print-ready label sheet layout
- `AddressLabel` — Individual label rendering
- `ImbBarcode` — USPS Intelligent Mail barcode SVG
- `PostnetBarcode` — POSTNET barcode SVG
- `MailMergeTab` — Word document mail merge interface

### Template Editor

**Route**: `/tools/templateeditor`

A visual email/document template editor built with GrapesJS for creating and editing Ministry Platform templates.

**Features:**
- Visual drag-and-drop template editing via GrapesJS
- Merge field picker for Ministry Platform data tokens
- HTML code editor for advanced editing
- Template import/export
- MP template integration

**Components** (`src/components/template-editor/`):
- `TemplateEditorForm` — Main editor orchestrator
- `EditorCanvas` — GrapesJS editor wrapper
- `EditorToolbar` — Editor action toolbar
- `EditorCodeDialog` — HTML source code editor
- `EditorImportDialog` — Template import dialog
- `EditorExportDialog` — Template export dialog
- `MergeFieldPicker` — MP merge field selection

### Template Tool

**Route**: `/tools/template`

A reference implementation demonstrating the tool framework pattern. Use this as a starting point for building new tools.

**Structure:**
```
src/app/(web)/tools/template/
├── page.tsx           # Server component — parses URL params via parseToolParams()
└── template-tool.tsx  # Client component — renders inside ToolContainer
```

### Building Custom Tools

All tools follow a consistent pattern:

1. **Server component** (`page.tsx`) parses URL search params and fetches page metadata
2. **Client component** renders the UI inside `ToolContainer` with header/footer actions
3. **Server actions** (`actions.ts`) call service singletons for MP operations
4. Tools receive standard MP parameters: `pageID`, `s` (selection), `recordID`, `recordDescription`

**Quick start:**
```bash
# Use the Claude Code command to scaffold a new tool
/newtool MyToolName
```

Or manually:
1. Copy the `template` folder to create your new tool directory
2. Rename files and components
3. Implement your logic inside the `ToolContainer`
4. Remove `ToolParamsDebug` and `UserToolsDebug` before production

**URL Parameter Utilities** (`src/lib/tool-params.ts`):
- `parseToolParams(searchParams)` — Parses and fetches page metadata
- `isNewRecord(params)` — Returns true if `recordID === -1` or undefined
- `isEditMode(params)` — Returns true if editing an existing record

## Ministry Platform Integration

### MPHelper — Public API

The main entry point for interacting with Ministry Platform:

```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';
import { ContactLogSchema } from '@/lib/providers/ministry-platform/models';

const mp = new MPHelper();

// Get records with query parameters
const contacts = await mp.getTableRecords({
  table: 'Contacts',
  filter: 'Contact_Status_ID=1',
  select: 'Contact_ID,Display_Name,Email_Address',
  orderBy: 'Last_Name',
  top: 50
});

// Create records with Zod validation (recommended)
await mp.createTableRecords('Contact_Log', [{
  Contact_ID: 12345,
  Contact_Date: new Date().toISOString(),
  Made_By: 1,
  Notes: 'Follow-up call completed'
}], {
  schema: ContactLogSchema,
  $userId: 1
});

// Update with partial validation (default)
await mp.updateTableRecords('Contact_Log', records, {
  schema: ContactLogSchema,
  partial: true
});

// Execute stored procedures
const results = await mp.executeProcedureWithBody('api_Custom_Procedure', {
  '@ContactID': 12345
});

// File operations
const files = await mp.getFilesByRecord({
  tableName: 'Contacts',
  recordId: 12345
});
```

### API Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **Table** | CRUD operations | `getTableRecords`, `createTableRecords`, `updateTableRecords`, `deleteTableRecords` |
| **Procedure** | Stored procedures | `getProcedures`, `executeProcedure`, `executeProcedureWithBody` |
| **Communication** | Email/SMS with attachments | `createCommunication`, `sendMessage` |
| **File** | File management | `getFilesByRecord`, `uploadFiles`, `updateFile`, `deleteFile`, `getFileContentByUniqueId` |
| **Metadata** | Schema info | `getTables`, `refreshMetadata` |
| **Domain** | Domain config | `getDomainInfo`, `getGlobalFilters` |

### Type Generation

Generate TypeScript interfaces and Zod schemas from your Ministry Platform database:

```bash
# Generate all types with Zod schemas (recommended)
npm run mp:generate:models

# Generate for specific tables
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -s "Contact"

# See all options
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --help
```

**CLI Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./generated-types` |
| `-s, --search <term>` | Filter tables by name | (all tables) |
| `-z, --zod` | Generate Zod schemas | `false` |
| `-c, --clean` | Remove old files first | `false` |
| `-d, --detailed` | Sample records for type inference | `false` |
| `--sample-size <num>` | Records to sample | `5` |

**Generated output** (for `mp:generate:models`):
- 436 TypeScript interfaces with JSDoc comments, FK annotations, and type constraints
- 436 Zod validation schemas with email/URL/length validators
- 1 barrel export `index.ts`
- Schema documentation at `.claude/references/ministryplatform.schema.md`

## Components

### UI Components (`src/components/ui/`)

22 shadcn/ui components built with Radix UI primitives and Tailwind CSS v4 (new-york style, slate theme, lucide icons):

Alert, Alert Dialog, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Command, Dialog, Drawer, Dropdown Menu, Form, Input, Label, Popover, Radio Group, Select, Skeleton, Switch, Textarea, Tooltip

### Layout Components (`src/components/layout/`)

- **AuthWrapper** — Server component that validates session via `auth.api.getSession()` and redirects to `/signin` if unauthenticated

### Tool Framework (`src/components/tool/`)

- **ToolContainer** — Full-screen flex layout with header, scrollable content, and footer actions
- **ToolHeader** — Dark slate title bar with optional info tooltip
- **ToolFooter** — Close/Save action buttons with loading state
- **ToolParamsDebug** — Development helper showing parsed URL parameters (remove before production)
- **SelectionDebug** — Development helper for debugging MP selection data

### Feature Components

- **address-labels/** — 12 components for address label printing, barcode generation, and mail merge
- **template-editor/** — 12 components for visual template editing with GrapesJS
- **user-menu/** — User dropdown with profile display and OIDC sign-out action
- **user-tools-debug/** — Development helper showing authorized tool paths (remove before production)
- **shared-actions/** — Cross-feature server actions (`getCurrentUserProfile`)

All components use kebab-case file naming, PascalCase component names, and named exports with barrel index files.

## Services

Application services provide business logic abstraction with the singleton pattern:

| Service | File | Purpose | Key Methods |
|---------|------|---------|-------------|
| **UserService** | `userService.ts` | User profile with roles and groups | `getUserProfile(userGuid)` — parallel queries for user data, roles, and group memberships |
| **ToolService** | `toolService.ts` | Page metadata and permissions | `getPageData(pageID)`, `getUserTools(domainId, userId)` — via stored procedures |
| **AddressLabelService** | `addressLabelService.ts` | Address fetching and label data | Address queries from MP selections and saved selections for label printing |

**Data flow:**
```
Server Action -> Service.getInstance() -> MPHelper -> Ministry Platform API
```

**DTOs** (`src/lib/dto/`): Hand-written application-level types including `LabelData`, `LabelConfig`, `SkipRecord`, `AddressMode`, `BarcodeFormat`, and more.

## Testing

### Overview

- **Framework**: Vitest 4.1 with jsdom environment
- **Libraries**: @testing-library/react, @testing-library/jest-dom
- **Coverage**: v8 provider
- **Total**: **241 test cases across 21 test files**

### Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report
```

### Test Coverage

| Area | Test File | What's Covered |
|------|-----------|----------------|
| MPHelper | `helper.test.ts` | All CRUD operations, Zod validation, domain/metadata/procedure/file methods |
| HTTP Client | `http-client.test.ts` | URL building, GET/POST/PUT/DELETE, FormData uploads, error handling |
| Table Service | `table.service.test.ts` | Table CRUD with query params, error codes (404, 401, 409) |
| Address Label Service | `addressLabelService.test.ts` | Address fetching, label data generation |
| Address Label Actions | `actions.test.ts` | Address label server actions |
| MP Client | `client.test.ts` | OAuth token lifecycle, refresh, concurrent calls, expiry buffer |
| Auth | `auth.test.ts` | Custom session, name splitting, OAuth config, userGuid mapping |
| Provider | `provider.test.ts` | Singleton pattern, service delegation |
| Proxy | `proxy.test.ts` | Route protection, public paths, session cookie checks |
| Tool Service | `toolService.test.ts` | Page data, user tools, stored procedure calls |
| Selection Debug | `selection-debug-actions.test.ts` | Selection resolution server actions |
| User Context | `user-context.test.tsx` | UserProvider lifecycle, profile loading, error handling |
| User Service | `userService.test.ts` | Profile with roles/groups, parallel queries |
| User Tools Debug | `actions.test.ts` | Authorization checks, session validation |
| User Menu | `actions.test.ts` | Sign-out action, OIDC logout redirect |
| Shared Actions | `user.test.ts` | getCurrentUserProfile delegation |
| Session Context | `session-context.test.tsx` | useAppSession hook wrapper |
| IMb Encoder | `imb-encoder.test.ts` | USPS Intelligent Mail barcode encoding |
| POSTNET Encoder | `postnet-encoder.test.ts` | POSTNET barcode encoding |
| Barcode Helpers | `barcode-helpers.test.ts` | Barcode generation utilities |
| Label Stock | `label-stock.test.ts` | Label stock definitions and calculations |

### Key Testing Patterns

- **`vi.hoisted()`** for mock variables referenced inside `vi.mock()` factories
- **MPHelper mock**: Use mock class syntax, not `vi.fn().mockImplementation()`
- **Singleton reset**: `(ServiceClass as any).instance = undefined` in `beforeEach`
- **Server action mocks**: Mock `@/lib/auth`, `next/headers`, and service singletons
- **Fake timers**: `vi.useFakeTimers()` for token expiry testing

## Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build (includes type checking)
npm start                # Start production server

# Code Quality
npm run lint             # ESLint (native flat config)
npm test                 # Vitest watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report

# Ministry Platform
npm run mp:generate:models      # Generate types + Zod schemas to models/ (recommended)
npm run mp:generate:storedprocs # Generate stored procedure reference

# Setup
npm run setup            # Interactive setup wizard
npm run setup:check      # Validate setup without changes
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.1.7 | App Router, Turbopack, React Server Components |
| react | ^19.2.4 | UI framework |
| better-auth | ^1.5.5 | OAuth authentication with genericOAuth plugin |
| zod | ^4.3.6 | Runtime validation (v4 API) |
| react-hook-form | ^7.71.1 | Form state management |
| tailwindcss | ^4.2.0 | Utility-first CSS |
| lucide-react | ^1.8.0 | Icon library |
| vitest | ^4.1.0 | Test framework |
| typescript | ^6.0.2 | Type safety |

## Claude Code Commands

This project includes 5 custom [Claude Code](https://claude.ai/code) commands to streamline development:

| Command | Description |
|---------|-------------|
| `/audit-deps` | Security audit + dependency update analysis with CVE checks |
| `/branch-commit [args]` | Create branch and commit, optionally from GitHub issue |
| `/newtool [name]` | Scaffold a new tool with route, component, and homepage card |
| `/pr [args]` | Create a validated pull request with auto-detected issue links |
| `/release [args]` | Create a GitHub release with calver versioning and auto-generated changelog |

### `/audit-deps`

Runs `npm audit`, searches for CVEs affecting major dependencies, categorizes updates as safe (patch/minor) vs major, and generates a prioritized action plan.

### `/branch-commit`

```bash
/branch-commit                    # Prompts for branch name and message
/branch-commit #123               # Auto-generates from GitHub issue
/branch-commit feature/my-change: Add new feature
```

Branch naming: `fix/issue-<id>-<slug>` for bugs, `feature/issue-<id>-<slug>` for features.

### `/newtool`

```bash
/newtool TeamRoster               # Creates route, component, and homepage card
/newtool EventCheckin, BatchEmail  # Multiple tools at once
```

Generates: route page, client component with ToolContainer, and a card on the dashboard.

### `/pr`

```bash
/pr                    # Create PR to main
/pr --base dev         # Target dev branch
/pr --draft            # Draft PR
/pr #123               # Link to issue
```

Validates: not on main, no uncommitted changes, branch pushed, no duplicate PR.

### `/release`

```bash
/release               # Auto-detect version, generate changelog
/release --draft       # Create as draft release
/release --prerelease  # Mark as pre-release
```

Uses calver format: `v{YYYY}.{MM}.{DD}.{HHmm}`. Categorizes PRs as features, fixes, docs, or maintenance.

### Command Files

```
.claude/commands/
├── audit-deps.md
├── branch-commit.md
├── newtool.md
├── pr.md
└── release.md
```

## Documentation

| Document | Description |
|----------|-------------|
| **[CLAUDE.md](CLAUDE.md)** | Development guide — commands, architecture, code style, testing patterns |
| **[Ministry Platform Provider](src/lib/providers/ministry-platform/docs/README.md)** | Complete REST API client documentation |
| **[Type Generator](src/lib/providers/ministry-platform/scripts/README.md)** | CLI tool for generating TypeScript types from MP schema |
| **[Auth Reference](.claude/references/auth.md)** | Better Auth config, OAuth flow, session access, userGuid vs user.id |
| **[Components Reference](.claude/references/components.md)** | Component inventory with compliance status |
| **[Services Reference](.claude/references/services.md)** | Service layer docs, MP query patterns, DTOs |
| **[Testing Reference](.claude/references/testing.md)** | Vitest patterns, mock setup, coverage data |
| **[MP Schema Reference](.claude/references/ministryplatform.schema.md)** | Auto-generated database schema (436 tables) |
| **[MP Stored Procedures](.claude/references/ministryplatform.storedprocs.md)** | Auto-generated stored procedure reference |

## Code Style & Conventions

### Import Paths

Use the `@/*` path alias for all internal imports:
```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';
import { Button } from '@/components/ui/button';
import { AuthWrapper } from '@/components/layout';
import { ToolContainer, SelectionDebug } from '@/components/tool';
import { useUser, useAppSession } from '@/contexts';
```

### Naming Conventions

| Convention | Usage |
|------------|-------|
| **PascalCase** | Components, types, interfaces |
| **camelCase** | Functions, variables |
| **kebab-case** | All files and folders |
| **snake_case** | Ministry Platform API fields |

### Component Conventions

- React Server Components by default; `"use client"` only when needed
- Named exports only (no default exports)
- Feature components organized in kebab-case folders with `index.ts` barrel exports
- Server actions co-located as `actions.ts` in feature folders
- Shared actions in `src/components/shared-actions/`

### Component Organization

```
src/components/
├── address-labels/       # Address label printing & mail merge (12 files)
├── layout/               # AuthWrapper
├── shared-actions/       # Cross-feature server actions
├── template-editor/      # Visual template editor (12 files)
├── tool/                 # Tool framework (Container, Header, Footer, ParamsDebug, SelectionDebug)
├── ui/                   # shadcn/ui components (22)
├── user-menu/            # User dropdown + sign-out action
└── user-tools-debug/     # Dev authorization helper
```

### Best Practices

1. **Use service classes in server actions** — call `src/services/` singletons, not MPHelper directly
2. **Validate at API boundaries** — pass optional `schema` parameter in `createTableRecords()` / `updateTableRecords()`
3. **Regenerate types** after MP schema changes: `npm run mp:generate:models`
4. **Never edit generated files** in `src/lib/providers/ministry-platform/models/`
5. **Run tests** before committing: `npm run test:run`
6. **Use `session.user.userGuid`** for all MP API lookups (not `session.user.id`)
7. Access MP fields with special characters using bracket notation: `event["Allow_Check-in"]`

## License

Private

## Support

For Ministry Platform API documentation, refer to your instance's API documentation portal.

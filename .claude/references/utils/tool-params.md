---
title: Tool URL Parameters (parseToolParams, PageData)
domain: utils
type: reference
applies_to:
  - src/lib/tool-params.ts
  - src/lib/tool-params.server.ts
  - src/lib/utils.ts
symbols:
  - ToolParams
  - PageData
  - parseToolParams
  - isNewRecord
  - isEditMode
  - cn
related:
  - ../services/README.md
  - ../components/README.md
last_verified: 2026-10-10
---

## Purpose
Parses the Ministry Platform-standard tool URL query string (`pageID`, `s`, `recordID`, `recordDescription`, etc.) into a typed `ToolParams` object, optionally hydrating `pageData` via `ToolService.getPageData()`. Every tool under `src/app/(web)/tools/*/page.tsx` funnels through this. The parser lives in the server-only `src/lib/tool-params.server.ts`; the types and pure predicates stay in the client-safe `src/lib/tool-params.ts`. The sibling `src/lib/utils.ts` holds the shadcn `cn()` Tailwind class merger (documented below for completeness).

## Files
- `src/lib/tool-params.ts` — **client-safe**: `ToolParams`, `PageData`, `isNewRecord`, `isEditMode`. Must never import a service (CLAUDE.md rule 16).
- `src/lib/tool-params.server.ts` — `import "server-only"`; `parseToolParams` (+ private `parseIntOrUndefined`, `safeDecode`). Imports `ToolService` via dynamic `import()`.
- `src/lib/tool-params.test.ts` — covers input shapes, NaN guard, `recordDescription` decoding, `pageData` hydration, both predicates
- `src/lib/utils.ts` — shadcn `cn()` (`twMerge(clsx(...))`), 26 non-test consumers

## Key concepts
- **MP tool URL contract** — When Ministry Platform launches a tool, it appends a standard query string naming the page, selection, and (optionally) target record. `parseToolParams` is the single ingestion point.
- **Page hydration** — If `pageID` is present, `parseToolParams` eagerly fetches `PageData` via the `api_Tools_GetPageData` stored procedure (through `ToolService`, which gates `dp_Pages`/`read`). Failure — including an authorization refusal — is non-fatal: it's caught and logged, leaving `pageData: undefined`.
- **Gate before parse** — every tool page calls `requireToolAccess(...)` (`src/app/(web)/tools/require-tool-access.ts`) *before* `parseToolParams`.
- **`recordID === -1` means "new record"** — MP uses `-1` to signal new-record intent; `isNewRecord()` treats `-1` or `undefined` as new; `isEditMode()` is its negation.
- **`searchParams` is polymorphic** — Accepts both a `URLSearchParams` (runtime) and Next.js 16's awaited `{ [k]: string | string[] | undefined }` shape.

## Standard query parameters

| Key | Type | Parsed to | Meaning |
|-----|------|-----------|---------|
| `pageID` | int | `pageID` + triggers `pageData` fetch | MP page/table the tool is operating on |
| `s` | int | `s` | Selection ID (primary selection) |
| `sc` | int | `sc` | Selection count |
| `p` | int | `p` | Page number (pagination) |
| `q` | string | `q` | Free-text query |
| `v` | int | `v` | View ID |
| `recordID` | int | `recordID` | PK of target record; `-1` = new |
| `recordDescription` | string (URI-encoded) | `recordDescription` (decoded) | Display string for the record |
| `addl` | string | `addl` | Tool-specific additional payload |

## API / Interface

### `ToolParams` and `PageData`
```typescript
export interface PageData {
  Page_ID: number;
  Display_Name: string;
  Singular_Name: string;
  Table_Name: string;
  Primary_Key: string;
  Selected_Record_Expression?: string;
  Start_Date_Field?: string;
  End_Date_Field?: string;
  Contact_ID_Field?: string;
  Filter_Clause?: string;
  Global_Filter_ID_Field?: string;
}

export interface ToolParams {
  pageID?: number;
  s?: number;
  sc?: number;
  p?: number;
  q?: string;
  v?: number;
  recordID?: number;
  recordDescription?: string;
  addl?: string;
  pageData?: PageData;
}
```

### Functions
```typescript
export async function parseToolParams(
  searchParams: URLSearchParams | { [key: string]: string | string[] | undefined }
): Promise<ToolParams>;
// - Integer params parsed via parseIntOrUndefined (NaN → undefined)
// - recordDescription goes through safeDecode (decodeURIComponent, raw on URIError)
// - pageData fetched via (await import("@/services/toolService")).ToolService
//   .getInstance().getPageData(pageID); failures are caught and logged
//   (pageData stays undefined)
// Defined in src/lib/tool-params.server.ts (server-only).

export function isNewRecord(params: ToolParams): boolean;
// params.recordID === -1 || params.recordID === undefined

export function isEditMode(params: ToolParams): boolean;
// !isNewRecord(params)
```

### `cn()` utility — `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Standard shadcn helper for merging Tailwind class strings while deduplicating conflicting utilities. Used by every component in `src/components/ui/**` (22 files) plus 4 feature components (`field-management/page-search.tsx`, `group-wizard/{contact-search,group-search,wizard-stepper}.tsx`).

## How it works

1. `parseToolParams` normalizes `searchParams` reads through a single `getValue(key)` shim (handles both `URLSearchParams` and Next.js's awaited object shape; arrays collapse to first element).
2. Raw strings are converted: numeric fields via `parseIntOrUndefined` (finite integer or `undefined`), `recordDescription` via `safeDecode` (`decodeURIComponent`, falling back to the raw string on a malformed escape such as a stray `%`).
3. If `pageID` parsed as a number, `ToolService` is dynamically imported and `getInstance()` + `getPageData(pageID)` is awaited.
4. Any error fetching page data is swallowed with `console.warn('tool_params.page_data_unavailable', { pageID })` and `pageData` remains `undefined` — **tools must handle that case**.
5. `isNewRecord` / `isEditMode` are pure predicates.

## Usage

### In a tool page (Next.js 16 server component)
From `src/app/(web)/tools/addresslabels/page.tsx:1-16`:

```typescript
import { AddressLabels } from './address-labels';
import { requireToolAccess } from '@/app/(web)/tools/require-tool-access';
import { parseToolParams } from '@/lib/tool-params.server';

interface AddressLabelsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddressLabelsPage({ searchParams }: AddressLabelsPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: 'Contacts', operation: 'read' });

  const params = await parseToolParams(await searchParams);

  return <AddressLabels params={params} />;
}
```

### New-record branching
From `src/app/(web)/tools/groupwizard/group-wizard.tsx:12`:

```typescript
import { ToolParams, isNewRecord } from "@/lib/tool-params";
```

### Dev panel
From `src/components/dev-panel/panels/params-panel.tsx:1`:

```typescript
import { ToolParams, isNewRecord, isEditMode } from "@/lib/tool-params";
```

## Consumers
Server-side (call `parseToolParams`, imported from `@/lib/tool-params.server`):
- `src/app/(web)/tools/addeditfamily/page.tsx`
- `src/app/(web)/tools/addresslabels/page.tsx`
- `src/app/(web)/tools/fieldmanagement/page.tsx`
- `src/app/(web)/tools/groupwizard/page.tsx`
- `src/app/(web)/tools/template/page.tsx`

Client/UI (consume the `ToolParams` type and/or predicates):
- `src/components/tool/tool-container.tsx`
- `src/components/dev-panel/dev-panel.tsx` + `panels/*`
- Each tool's root component (`add-edit-family.tsx`, `group-wizard.tsx`, `field-management.tsx`, `template-tool.tsx`, `address-labels.tsx`)

## Gotchas
- **`pageData` may be `undefined` even when `pageID` is set.** The fetch is wrapped in `try/catch` and swallowed — callers must guard. See `src/lib/tool-params.server.ts:64-78`.
- **`recordDescription` is URI-decoded; other strings are not.** Only `recordDescription` passes through `safeDecode`. `q` and `addl` come through raw. A malformed escape (`50% off`) used to throw `URIError` and crash the tool page; it now comes through raw.
- **Non-numeric integer params become `undefined`, not `NaN`.** `parseIntOrUndefined` returns `undefined` unless the parse is finite (GOTCHA-043). Callers still validate range (e.g. `> 0`) themselves.
- **Never import `parseToolParams` (or any service) into `tool-params.ts`.** A client component importing it would drag `next/headers` into the client graph and fail the Turbopack build; a dynamic `import()` there still creates the graph edge (CLAUDE.md rule 16).
- **`searchParams` must be awaited first.** Next.js 16 dynamic APIs (`params`, `searchParams`) are `Promise`s; `await searchParams` in the page, then pass the result to `parseToolParams`.

## Related docs
- `../services/README.md` — `ToolService.getPageData(pageID)` is invoked here
- `../components/README.md` — `tool/tool-container.tsx`, `dev-panel/**`, and each tool root component consume `ToolParams`
- `barcodes.md` / `label-stock.md` — sibling utilities in this domain

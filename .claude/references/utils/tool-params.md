---
title: Tool URL Parameters (parseToolParams, PageData)
domain: utils
type: reference
applies_to:
  - src/lib/tool-params.ts
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
last_verified: 2026-04-17
---

## Purpose
Parses the Ministry Platform-standard tool URL query string (`pageID`, `s`, `recordID`, `recordDescription`, etc.) into a typed `ToolParams` object, optionally hydrating `pageData` via `ToolService.getPageData()`. Every tool under `src/app/(web)/tools/*/page.tsx` funnels through this. The sibling `src/lib/utils.ts` holds the shadcn `cn()` Tailwind class merger (documented below for completeness).

## Files
- `src/lib/tool-params.ts` — parser + `ToolParams`, `PageData`, `isNewRecord`, `isEditMode`
- `src/lib/utils.ts` — shadcn `cn()` (`twMerge(clsx(...))`), 27 consumers

No test file exists for `tool-params.ts` (see TODO drop).

## Key concepts
- **MP tool URL contract** — When Ministry Platform launches a tool, it appends a standard query string naming the page, selection, and (optionally) target record. `parseToolParams` is the single ingestion point.
- **Page hydration** — If `pageID` is present, `parseToolParams` eagerly fetches `PageData` via the `api_Tools_GetPageData` stored procedure (through `ToolService`). Failure is non-fatal: it's caught and logged, leaving `pageData: undefined`.
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
// - Integer params parsed via parseInt(_, 10)
// - recordDescription is decodeURIComponent()'d
// - pageData fetched via ToolService.getInstance().getPageData(pageID);
//   failures are caught and logged (pageData stays undefined)

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
Standard shadcn helper for merging Tailwind class strings while deduplicating conflicting utilities. Used by every component in `src/components/ui/**` (22 files) plus select feature components.

## How it works

1. `parseToolParams` normalizes `searchParams` reads through a single `getValue(key)` shim (handles both `URLSearchParams` and Next.js's awaited object shape; arrays collapse to first element).
2. Raw strings are converted: numeric fields via `parseInt(..., 10)`, `recordDescription` via `decodeURIComponent`.
3. If `pageID` parsed as a number, `ToolService.getInstance()` + `getPageData(pageID)` is awaited.
4. Any error fetching page data is swallowed with `console.warn('Could not fetch page data for pageID:', ..., '- Stored procedure may not exist yet')` and `pageData` remains `undefined` — **tools must handle that case**.
5. `isNewRecord` / `isEditMode` are pure predicates.

## Usage

### In a tool page (Next.js 16 server component)
From `src/app/(web)/tools/addresslabels/page.tsx:2-11`:

```typescript
import { parseToolParams } from '@/lib/tool-params';

interface AddressLabelsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddressLabelsPage({ searchParams }: AddressLabelsPageProps) {
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
Server-side (call `parseToolParams`):
- `src/app/(web)/tools/addresslabels/page.tsx`
- `src/app/(web)/tools/fieldmanagement/page.tsx`
- `src/app/(web)/tools/groupwizard/page.tsx`
- `src/app/(web)/tools/template/page.tsx`
- `src/app/(web)/tools/templateeditor/page.tsx`

Client/UI (consume the `ToolParams` type and/or predicates):
- `src/components/tool/tool-container.tsx`
- `src/components/dev-panel/dev-panel.tsx` + `panels/*`
- Each tool's root component (`group-wizard.tsx`, `field-management.tsx`, `template-tool.tsx`, `address-labels.tsx`, `template-editor.tsx`)

## Gotchas
- **`pageData` may be `undefined` even when `pageID` is set.** The fetch is wrapped in `try/catch` and swallowed — callers must guard. See `src/lib/tool-params.ts:54-60`.
- **`recordDescription` is URI-decoded; other strings are not.** Only `recordDescription` passes through `decodeURIComponent`. `q` and `addl` come through raw.
- **Integer parse errors silently produce `NaN` via `parseInt` semantics.** `parseInt('abc', 10)` returns `NaN` (note: `NaN === NaN` is `false` — use `Number.isNaN()` to test). The conditional `x ? parseInt(x, 10) : undefined` still assigns `NaN` back when `x` is a non-empty non-numeric string. Callers that check `typeof pageID === 'number'` see `NaN` (passes, since `typeof NaN === 'number'`), so pre-validation is the caller's responsibility.
- **`searchParams` must be awaited first.** Next.js 16 dynamic APIs (`params`, `searchParams`) are `Promise`s; `await searchParams` in the page, then pass the result to `parseToolParams`.

## Related docs
- `../services/README.md` — `ToolService.getPageData(pageID)` is invoked here
- `../components/README.md` — `tool/tool-container.tsx`, `dev-panel/**`, and each tool root component consume `ToolParams`
- `barcodes.md` / `label-stock.md` — sibling utilities in this domain

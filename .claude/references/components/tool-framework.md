---
title: Tool Framework (ToolContainer / ToolHeader / ToolFooter)
domain: components
type: reference
applies_to:
  - src/components/tool/tool-container.tsx
  - src/components/tool/tool-header.tsx
  - src/components/tool/tool-footer.tsx
  - src/components/tool/index.ts
symbols: [ToolContainer, ToolHeader, ToolFooter]
related:
  - dev-panel.md
  - layout.md
  - ui.md
last_verified: 2026-04-17
---

## Purpose
Reusable layout shell used by every tool page: a dark slate title bar, a scrollable body, and a sticky footer with Close/Save buttons. `ToolContainer` also auto-renders the developer overlay (`DevPanel`) when a `params` prop is supplied.

## Files
- `src/components/tool/tool-container.tsx` — full-screen flex shell, composes header + body + footer, mounts `DevPanel` conditionally
- `src/components/tool/tool-header.tsx` — dark slate (`bg-slate-700`) title bar with optional info tooltip
- `src/components/tool/tool-footer.tsx` — white footer with Close + Save buttons and loading state
- `src/components/tool/index.ts` — barrel: `ToolContainer`, `ToolFooter`, `ToolHeader`

## Key concepts
- Composition via `children`; no internal router or data fetching
- `"use client"` only on `ToolContainer` (it imports the client-only `DevPanel`); `ToolHeader` and `ToolFooter` are plain React (no `"use client"` directive, but contain no async server work — safe to import from either)
- Dev overlay gating lives inside `DevPanel`, not `ToolContainer`: `ToolContainer` always renders `<DevPanel />` when `params` is passed, and `DevPanel` itself early-returns `null` when `NODE_ENV !== "development"` or hostname is not `localhost`/`127.0.0.1` (`src/components/dev-panel/dev-panel.tsx:20,56-58`)
- Footer buttons: Close is an `outline` variant; Save uses `bg-cyan-600 hover:bg-cyan-700` and swaps label to `"Saving..."` while `isSaving`
- Header info tooltip uses shadcn `Tooltip` + `Info` icon from lucide, anchored to `side="left"` with `max-w-xs`

## API / Interface

### `ToolContainer`
Source: `src/components/tool/tool-container.tsx:8-20`
```typescript
interface ToolContainerProps {
  title: string;
  params?: ToolParams;              // if set, DevPanel is mounted above header
  infoContent?: React.ReactNode;    // forwarded to ToolHeader tooltip
  onClose?: () => void;
  onSave?: () => void;
  closeLabel?: string;
  saveLabel?: string;
  isSaving?: boolean;
  hideFooter?: boolean;
  footerExtra?: React.ReactNode;    // slot on the left side of the footer
  children: React.ReactNode;
}
```
`ToolParams` comes from `src/lib/tool-params.ts:17-28`.

### `ToolHeader`
Source: `src/components/tool/tool-header.tsx:9-12`
```typescript
interface ToolHeaderProps {
  title: string;
  infoContent?: React.ReactNode;
}
```

### `ToolFooter`
Source: `src/components/tool/tool-footer.tsx:3-10`
```typescript
interface ToolFooterProps {
  onClose?: () => void;
  onSave?: () => void;
  closeLabel?: string;    // default "Close"
  saveLabel?: string;     // default "Save"
  isSaving?: boolean;     // default false — disables both buttons, shows "Saving..."
  footerExtra?: React.ReactNode;
}
```

## How it works
- `ToolContainer` renders:
  1. `{params && <DevPanel params={params} />}` — stripe above title (only visible in dev+localhost)
  2. `<ToolHeader title={...} infoContent={...} />`
  3. `<div className="flex-1 overflow-auto bg-gray-50">{children}</div>` — scroll area
  4. `{!hideFooter && <ToolFooter ... />}`
- Root: `<div className="flex flex-col h-screen">` — always full viewport height, header + footer are natural height, body flexes
- `ToolHeader` only renders the info button when `infoContent` is truthy; button is round `w-8 h-8` with hover tint
- `ToolFooter` lays out as `[footerExtra] [flex-1 spacer] [Close] [Save]` — the spacer pushes action buttons to the right even when `footerExtra` is present

## Usage
From `src/components/tool/tool-container.tsx` (real source):
```tsx
<div className="flex flex-col h-screen">
  {params && <DevPanel params={params} />}
  <ToolHeader title={title} infoContent={infoContent} />

  <div className="flex-1 overflow-auto bg-gray-50">
    {children}
  </div>

  {!hideFooter && (
    <ToolFooter
      onClose={onClose}
      onSave={onSave}
      closeLabel={closeLabel}
      saveLabel={saveLabel}
      isSaving={isSaving}
      footerExtra={footerExtra}
    />
  )}
</div>
```

Typical consumer pattern:
```tsx
import { ToolContainer } from '@/components/tool';

<ToolContainer
  title="Address Labels"
  params={params}
  infoContent={<p>Info about this tool.</p>}
  onClose={() => window.close()}
  onSave={handleSave}
  isSaving={saving}
>
  {/* tool body */}
</ToolContainer>
```

## Gotchas
- `ToolContainer` is a client component (`"use client"` at `src/components/tool/tool-container.tsx:1`) because `DevPanel` reads `localStorage`/`window.location`. Importing it into a server component is fine — the boundary flips automatically.
- Passing `params` does NOT force the dev panel into production; `DevPanel` self-gates on `NODE_ENV === "development"` AND `hostname in {localhost, 127.0.0.1}`. To remove the stripe locally, drop the `params` prop.
- Save button visually differs from the default shadcn Button — it ships a hardcoded `bg-cyan-600 hover:bg-cyan-700`. Overriding requires editing `tool-footer.tsx` (no prop).
- Full-screen flex (`h-screen`) means nested modals/drawers that also use `h-screen` will double-stack; rely on the body's `overflow-auto` instead.

## Related docs
- `dev-panel.md` — how the auto-rendered overlay gates itself and which panels it includes
- `layout.md` — `AuthWrapper` wraps every tool; it sits outside `ToolContainer`
- `ui.md` — `Button` and `Tooltip` primitives used by the footer and header

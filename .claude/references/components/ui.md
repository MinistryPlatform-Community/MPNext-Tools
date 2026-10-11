---
title: shadcn/ui primitives
domain: components
type: reference
applies_to:
  - src/components/ui/
  - components.json
symbols: [Button, Dialog, Tooltip, Form, Select, DropdownMenu, Command, Drawer, AlertDialog, Card, Input, Textarea, Label, Checkbox, RadioGroup, Switch, Avatar, Badge, Breadcrumb, Alert, Popover, Skeleton]
related:
  - tool-framework.md
  - ../testing/README.md
last_verified: 2026-10-10
---

## Purpose
Inventory of the 22 shadcn/ui primitives installed under `src/components/ui/` and the shadcn config they follow.

## Files
- `src/components/ui/*.tsx` — 22 primitive component files (see inventory table)
- `components.json` — shadcn CLI config at repo root

## shadcn config
From `components.json`:

| Key | Value |
|---|---|
| `style` | `new-york` |
| `rsc` | `true` (React Server Components enabled) |
| `tsx` | `true` |
| `tailwind.config` | `tailwind.config.js` |
| `tailwind.css` | `src/app/globals.css` |
| `tailwind.baseColor` | `slate` |
| `tailwind.cssVariables` | `true` |
| `tailwind.prefix` | `""` (no prefix) |
| `iconLibrary` | `lucide` |
| `aliases.components` | `@/components` |
| `aliases.utils` | `@/lib/utils` |
| `aliases.ui` | `@/components/ui` |
| `aliases.lib` | `@/lib` |
| `aliases.hooks` | `@/hooks` |

## Inventory — 22 primitives

| File | Exports (role) |
|---|---|
| `alert.tsx` | `Alert`, `AlertTitle`, `AlertDescription` — inline status message |
| `alert-dialog.tsx` | `AlertDialog` + parts — modal confirm dialog (destructive actions) |
| `avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback` — user photo circle |
| `badge.tsx` | `Badge`, `badgeVariants` — small status pill |
| `breadcrumb.tsx` | `Breadcrumb` + parts — navigation trail |
| `button.tsx` | `Button`, `buttonVariants` — variants: `default | destructive | outline | secondary | ghost | link`; sizes: `default | sm | lg | icon` |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`, `CardFooter` |
| `checkbox.tsx` | `Checkbox` — Radix checkbox primitive |
| `command.tsx` | `Command` + parts — cmdk-based searchable list (used inside popovers) |
| `dialog.tsx` | `Dialog` + parts — generic modal |
| `drawer.tsx` | `Drawer` + parts — vaul bottom sheet |
| `dropdown-menu.tsx` | `DropdownMenu` + parts — Radix menu |
| `form.tsx` | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField` — react-hook-form bindings |
| `input.tsx` | `Input` — text input |
| `label.tsx` | `Label` — Radix label |
| `popover.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` — Radix popover |
| `radio-group.tsx` | `RadioGroup`, `RadioGroupItem` |
| `select.tsx` | `Select` + parts — Radix select (non-searchable) |
| `skeleton.tsx` | `Skeleton` — shimmer placeholder |
| `switch.tsx` | `Switch` — Radix toggle |
| `textarea.tsx` | `Textarea` — multiline input |
| `tooltip.tsx` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` — auto-wraps with `TooltipProvider` internally |

(22 files — re-counted 2026-10-10; see `../_meta/facts/2026-10-10.md`.)

## Key concepts
- **new-york style** — tighter spacing, subtler borders than the `default` style
- **slate base color with CSS variables** — theme tokens live in `src/app/globals.css` (e.g., `--primary`, `--background`). Components reference `bg-primary`, `text-foreground`, etc., not raw slate shades.
- **lucide icons** — all iconography is `lucide-react` (e.g., `Info` in `tool-header.tsx`, `ChevronDown`/`Terminal` in `dev-panel.tsx`). Do not introduce another icon set.
- **cva variants** — primitives with variants (`Button`, `Badge`) use `class-variance-authority`; `buttonVariants` / `badgeVariants` are exported so consumers can apply button styling to a `<Link>` via the shadcn `asChild` pattern.
- **Radix primitives under the hood** — most files wrap an individual `@radix-ui/react-*` package (`@radix-ui/react-tooltip`, `@radix-ui/react-dialog`, etc.; `Slot` from `@radix-ui/react-slot`) with Tailwind classes applied.
- **Plain function components with `data-slot`** — no `forwardRef` anywhere in `src/components/ui/` (React 19 passes `ref` as a prop); each part sets a `data-slot` attribute.
- **`cn()` utility** — every primitive uses `cn()` from `@/lib/utils` for class merging.

## Conventions when editing / adding
- Run `npx shadcn add <name>` to pull a new primitive — it will respect `components.json` (style + aliases + icon lib).
- Do not refactor shadcn primitives into default exports; the project enforces **named exports only** across `src/**`.
- Keep `"use client"` where shadcn put it: the 14 Radix/stateful primitives have it; `alert`, `badge`, `breadcrumb`, `button`, `card`, `input`, `skeleton`, `textarea` do not (server-renderable).
- New primitives should re-use `cn()` and CSS-variable theme tokens; avoid hardcoding `slate-*` colors.

## Gotchas
- **`Tooltip` auto-wraps with `TooltipProvider`.** You don't need to add a provider at the app root when using `<Tooltip>` directly (see `src/components/ui/tooltip.tsx:21-29`). But if you mount many tooltips, wrapping a subtree in a single `<TooltipProvider>` manually can still be a perf win.
- **Save button in `ToolFooter` is hardcoded cyan**, not `Button`'s `default` variant. See `tool-framework.md`.

## Usage
Typical primitive import (per shadcn convention — individual imports, no barrel):
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

Real example from `src/components/tool/tool-header.tsx`:
```tsx
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button aria-label="Information">
        <Info className="w-5 h-5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="left" className="max-w-xs">
      {infoContent}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Related docs
- `tool-framework.md` — consumers of `Button` and `Tooltip`
- `../testing/README.md` — primitives are rendered with `@testing-library/react` under `jsdom`

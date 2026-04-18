---
title: components
type: index
domain: components
---

## What's in this domain
Reference docs for `src/components/` — the tool layout framework, layout wrapper, UI primitives (shadcn/ui), and all feature components.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `tool-framework.md` | `ToolContainer` / `ToolHeader` / `ToolFooter` composition and props | Building a new tool page |
| `layout.md` | `AuthWrapper` server-side session gate + `shared-actions/` catalog | Wiring auth at the app shell, or adding a cross-feature server action |
| `ui.md` | Inventory of 22 shadcn/ui primitives + shadcn config (new-york, slate, lucide) | Picking a primitive or adding a new one via `npx shadcn add` |
| `address-labels.md` | Address label printing feature (shard 12) | Working on label rendering, IMb/POSTNET barcodes, mail-merge |
| `group-wizard.md` | Multi-step group wizard (shard 13) | Editing the 6-step create/edit group flow |
| `dev-panel.md` | Localhost-only developer overlay (shard 14) | Understanding `ToolContainer` auto-rendering behavior |
| `template-editor.md` | GrapesJS email/document template editor (shard 15) | Working on templates or merge fields |
| `field-management.md` | Drag-and-drop page field ordering (shard 16) | Working on MP page field layout UX |
| `user-menu.md` | User dropdown + OIDC sign-out (shard 17) | Working on sign-out or RP-initiated logout |

## Code surfaces
| Path | Role |
|------|------|
| `src/components/tool/` | `ToolContainer`, `ToolHeader`, `ToolFooter` — 4 files |
| `src/components/layout/` | `AuthWrapper` server component + test — 3 files |
| `src/components/ui/` | 22 shadcn/ui primitives |
| `src/components/shared-actions/` | Cross-feature server actions — 2 files (+ local `README.md`) |
| `src/components/address-labels/` | Address-label feature — 13 files |
| `src/components/dev-panel/` | Dev overlay — 3 files + `panels/` subdir |
| `src/components/field-management/` | Field-order editor — 10 files |
| `src/components/group-wizard/` | Group wizard — 14 files |
| `src/components/template-editor/` | Template editor — 12 files |
| `src/components/user-menu/` | User menu — 4 files |

## Conventions (domain-wide)
- File names: `kebab-case.tsx` (e.g., `tool-container.tsx`)
- Component names: `PascalCase` (e.g., `ToolContainer`)
- **Named exports only** — no `export default`
- Feature folders expose a `index.ts` barrel export
- `"use client"` is added only when a component needs interactivity; prefer Server Components
- Feature-specific server actions live in `actions.ts` next to their component; cross-feature actions go in `shared-actions/`

## Related domains
- `../auth/README.md` — `AuthWrapper` consumes `auth.api.getSession()`
- `../services/README.md` — server actions call service singletons (e.g., `UserService`)
- `../routing/README.md` — `proxy.ts` sets the `x-pathname` header that `AuthWrapper` reads
- `../testing/README.md` — component + action test patterns

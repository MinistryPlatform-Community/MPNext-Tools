# Component Reference Guide

This document provides detailed context about the `src/components/` folder structure for LLM assistants working on the MPNext project.

## Folder Overview

```
src/components/
├── layout/                     # Layout components (barrel export via index.ts)
│   ├── auth-wrapper.tsx        # Authentication wrapper (Server Component)
│   └── index.ts               # Barrel exports
├── shared-actions/             # Shared server actions
├── ui/                         # shadcn/ui components (19 components)
├── tool/                       # Tool layout components (ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug)
├── user-tools-debug/           # Debug: User permissions display (dev only)
└── user-menu/                  # User dropdown menu
```

## Component Categories

### Layout Components (`layout/` folder)

| File | Type | Purpose |
|------|------|---------|
| `layout/auth-wrapper.tsx` | Server | Wraps app to enforce authentication, redirects unauthenticated users |
| `layout/index.ts` | - | Barrel exports: `AuthWrapper` |

### Feature Components

| Folder | Purpose | Has Actions |
|--------|---------|-------------|
| `user-menu/` | User dropdown with sign-out | Yes |
| `tool/` | Tool layout components (ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug) | No |

### Debug Components (Development Only)

| Folder | Purpose | Remove Before Production |
|--------|---------|-------------------------|
| `tool/` (ToolParamsDebug) | Displays parsed URL tool parameters | Yes |
| `user-tools-debug/` | Shows user's authorized tool paths | Yes |

**Note**: `ToolParamsDebug` is located inside the consolidated `tool/` folder alongside the other tool layout components.

### UI Components (shadcn/ui)

19 components following shadcn conventions:
- `alert.tsx`, `alert-dialog.tsx`, `avatar.tsx`, `breadcrumb.tsx`
- `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`
- `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`
- `label.tsx`, `radio-group.tsx`, `select.tsx`, `skeleton.tsx`
- `switch.tsx`, `textarea.tsx`, `tooltip.tsx`

## Server Actions Location

Actions are co-located with their feature components:

| Feature | Actions File | Functions |
|---------|--------------|-----------|
| user-menu | `user-menu/actions.ts` | `handleSignOut` |
| user-tools-debug | `user-tools-debug/actions.ts` | `getUserTools` |
| **shared** | `shared-actions/user.ts` | `getCurrentUserProfile` |

**Shared Actions Folder**: `src/components/shared-actions/` contains actions used across multiple features. See the README in that folder for guidelines on when to use shared vs co-located actions.

## Import Patterns

```typescript
// Tool components (use barrel export)
import { ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug } from '@/components/tool';

// UI components (individual imports)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// Layout components (barrel export)
import { AuthWrapper } from '@/components/layout';

// Shared actions
import { getCurrentUserProfile } from '@/components/shared-actions/user';
```

## Component Structure Template

Each feature folder should follow this structure:

```
feature-name/
├── index.ts              # Barrel export: export { FeatureName } from './feature-name';
├── feature-name.tsx      # Main component file
├── actions.ts            # Server actions (if needed)
└── [sub-components].tsx  # Additional components (optional)
```

## Compliance Summary

All components pass the following checks:

| Criterion | Status |
|-----------|--------|
| File naming (kebab-case) | PASS |
| Component naming (PascalCase) | PASS |
| Named exports only (no default) | PASS |
| `@/` alias for imports | PASS |
| Barrel exports for features | PASS |
| `"use client"` where needed | PASS |
| `"use server"` for actions | PASS |
| TypeScript strict typing | PASS |

## Known Issues & Recommendations

### UI Component Notes

- **dialog.tsx**: Uses mixed patterns (direct assignment vs forwardRef) - works but inconsistent.
- **tooltip.tsx**: Auto-wraps with `TooltipProvider` internally - no need to wrap manually.

### Debug Components

The `ToolParamsDebug` (inside `tool/`) and `user-tools-debug` components are marked for removal before production. They are currently used in `src/app/(web)/tools/template/template-tool.tsx`.

Consider conditional rendering:
```typescript
import { ToolParamsDebug } from '@/components/tool';

{process.env.NODE_ENV === 'development' && <ToolParamsDebug params={params} />}
```

## Quick Reference: Component Responsibilities

### tool
- **Purpose**: Consolidated folder containing reusable layout components for tool interfaces
- **Components**: `ToolContainer`, `ToolHeader`, `ToolFooter`, `ToolParamsDebug`
- **Usage**: Wrap tool content with consistent header/footer styling
- **Pattern**: Composition via children prop
- **Import**: `import { ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug } from '@/components/tool';`
- **Note**: `ToolParamsDebug` is a debug component for development only

### user-menu
- **Purpose**: User profile dropdown with sign-out
- **Features**: Displays user name/email, implements OIDC logout flow
- **Note**: `handleSignOut` implements RP-initiated logout for Ministry Platform OAuth

## Services Used

Components interact with these service classes:

| Service | Location | Used By |
|---------|----------|---------|
| ToolService | `@/services/toolService` | user-tools-debug |
| UserService | `@/services/userService` | user-menu |

All services ultimately use `MPHelper` from `@/lib/providers/ministry-platform` for API calls.

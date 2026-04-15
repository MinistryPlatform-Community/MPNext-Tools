# Component Reference Guide

This document provides detailed context about the `src/components/` folder structure for LLM assistants working on the MPNext Tools project.

## Folder Overview

```
src/components/
├── address-labels/             # Address label printing & mail merge
│   ├── actions.ts              # Server actions for address fetching
│   ├── actions.test.ts         # Action tests
│   ├── address-label.tsx       # Individual label rendering
│   ├── address-labels-form.tsx # Configuration form
│   ├── address-labels-summary.tsx # Results summary with skip reporting
│   ├── imb-barcode.tsx         # USPS Intelligent Mail barcode SVG
│   ├── label-document.tsx      # Print-ready label sheet layout
│   ├── mail-merge-tab.tsx      # Word document mail merge interface
│   ├── postnet-barcode.tsx     # POSTNET barcode SVG
│   ├── sample-template.ts      # Sample Word template
│   ├── word-document.ts        # Word document generation
│   └── index.ts               # Barrel exports
├── layout/                     # Layout components (barrel export via index.ts)
│   ├── auth-wrapper.tsx        # Authentication wrapper (Server Component)
│   └── index.ts               # Barrel exports
├── shared-actions/             # Shared server actions
├── template-editor/            # Visual template editor (GrapesJS)
│   ├── actions.ts              # Server actions for template operations
│   ├── editor-canvas.tsx       # GrapesJS editor wrapper
│   ├── editor-code-dialog.tsx  # HTML source code editor
│   ├── editor-export-dialog.tsx # Template export dialog
│   ├── editor-import-dialog.tsx # Template import dialog
│   ├── editor-toolbar.tsx      # Editor action toolbar
│   ├── grapes-config.ts        # GrapesJS configuration
│   ├── merge-field-picker.tsx  # MP merge field selection
│   ├── merge-fields.ts         # Merge field definitions
│   ├── template-editor-form.tsx # Main editor orchestrator
│   ├── types.ts                # Type definitions
│   └── index.ts               # Barrel exports
├── tool/                       # Tool layout components (ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug, SelectionDebug)
├── ui/                         # shadcn/ui components (22 components)
├── user-menu/                  # User dropdown menu
└── user-tools-debug/           # Debug: User permissions display (dev only)
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
| `address-labels/` | Address label printing with IMb/POSTNET barcodes and mail merge | Yes |
| `template-editor/` | Visual email/document template editor with GrapesJS | Yes |
| `user-menu/` | User dropdown with sign-out | Yes |
| `tool/` | Tool layout components (ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug, SelectionDebug) | Yes |

### Debug Components (Development Only)

| Folder | Purpose | Remove Before Production |
|--------|---------|-------------------------|
| `tool/` (ToolParamsDebug) | Displays parsed URL tool parameters | Yes |
| `tool/` (SelectionDebug) | Displays MP selection data for debugging | Yes |
| `user-tools-debug/` | Shows user's authorized tool paths | Yes |

### UI Components (shadcn/ui)

22 components following shadcn conventions:
- `alert.tsx`, `alert-dialog.tsx`, `avatar.tsx`, `badge.tsx`
- `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`
- `command.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`
- `form.tsx`, `input.tsx`, `label.tsx`, `popover.tsx`
- `radio-group.tsx`, `select.tsx`, `skeleton.tsx`, `switch.tsx`
- `textarea.tsx`, `tooltip.tsx`

## Server Actions Location

Actions are co-located with their feature components:

| Feature | Actions File | Functions |
|---------|--------------|-----------|
| address-labels | `address-labels/actions.ts` | `fetchAddressLabels` |
| template-editor | `template-editor/actions.ts` | Template CRUD operations |
| user-menu | `user-menu/actions.ts` | `handleSignOut` |
| user-tools-debug | `user-tools-debug/actions.ts` | `getUserTools` |
| tool (selection) | `tool/selection-debug-actions.ts` | `resolveSelection` |
| **shared** | `shared-actions/user.ts` | `getCurrentUserProfile` |

**Shared Actions Folder**: `src/components/shared-actions/` contains actions used across multiple features. See the README in that folder for guidelines on when to use shared vs co-located actions.

## Import Patterns

```typescript
// Tool components (use barrel export)
import { ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug, SelectionDebug } from '@/components/tool';

// UI components (individual imports)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// Layout components (barrel export)
import { AuthWrapper } from '@/components/layout';

// Address label components (barrel export)
import { AddressLabelsForm, LabelDocument, ImbBarcode } from '@/components/address-labels';

// Template editor components (barrel export)
import { TemplateEditorForm } from '@/components/template-editor';

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

The `ToolParamsDebug` and `SelectionDebug` (inside `tool/`) and `user-tools-debug` components are marked for removal before production. They are currently used in `src/app/(web)/tools/template/template-tool.tsx`.

Consider conditional rendering:
```typescript
import { ToolParamsDebug } from '@/components/tool';

{process.env.NODE_ENV === 'development' && <ToolParamsDebug params={params} />}
```

## Quick Reference: Component Responsibilities

### tool
- **Purpose**: Consolidated folder containing reusable layout components for tool interfaces
- **Components**: `ToolContainer`, `ToolHeader`, `ToolFooter`, `ToolParamsDebug`, `SelectionDebug`
- **Usage**: Wrap tool content with consistent header/footer styling
- **Pattern**: Composition via children prop
- **Import**: `import { ToolContainer, ToolHeader, ToolFooter, ToolParamsDebug, SelectionDebug } from '@/components/tool';`
- **Note**: `ToolParamsDebug` and `SelectionDebug` are debug components for development only

### address-labels
- **Purpose**: Address label printing with USPS barcode support
- **Features**: IMb barcodes, POSTNET fallback, label sheet layout, Word document mail merge
- **Service**: Uses `AddressLabelService` for MP address queries

### template-editor
- **Purpose**: Visual email/document template editor
- **Features**: GrapesJS drag-and-drop editing, merge field support, HTML code editing, import/export

### user-menu
- **Purpose**: User profile dropdown with sign-out
- **Features**: Displays user name/email, implements OIDC logout flow
- **Note**: `handleSignOut` implements RP-initiated logout for Ministry Platform OAuth

## Services Used

Components interact with these service classes:

| Service | Location | Used By |
|---------|----------|---------|
| ToolService | `@/services/toolService` | user-tools-debug |
| UserService | `@/services/userService` | user-menu, shared-actions |
| AddressLabelService | `@/services/addressLabelService` | address-labels |

All services ultimately use `MPHelper` from `@/lib/providers/ministry-platform` for API calls.

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
├── field-management/           # Page field ordering / inline editing (drag-and-drop)
│   ├── actions.ts              # Server actions: fetchPages, fetchPageFieldData, savePageFieldOrder
│   ├── actions.test.ts         # Action tests
│   ├── field-order-editor.tsx  # Dnd-kit editor with grouped sortable fields
│   ├── new-group-dialog.tsx    # Dialog for creating ad-hoc field groups
│   ├── page-search.tsx         # Page selector with search
│   ├── sortable-field-item.tsx # Individual draggable field row with inline edit
│   ├── sortable-group.tsx      # Group container with drag handle
│   ├── use-field-order-state.ts # Hook managing dirty state and field mutations
│   ├── types.ts                # PageListItem, PageField, PageFieldData, FieldOrderPayload
│   └── index.ts               # Barrel exports
├── group-wizard/               # Multi-step group creation/edit wizard
│   ├── actions.ts              # Server actions for lookups, search, CRUD
│   ├── contact-search.tsx      # Debounced contact search popover
│   ├── group-search.tsx        # Debounced group search popover
│   ├── schema.ts               # Zod validation schema with per-step fields
│   ├── step-identity.tsx       # Step 0: Name, type, dates, description
│   ├── step-organization.tsx   # Step 1: Congregation, ministry, contact
│   ├── step-meeting.tsx        # Step 2: Meeting schedule, room, online
│   ├── step-attributes.tsx     # Step 3: Size, life stage, focus, book
│   ├── step-settings.tsx       # Step 4: Visibility, check-in, promotion
│   ├── step-review.tsx         # Step 5: Review and submit
│   ├── types.ts                # Interfaces, wizard steps, lookup types
│   ├── wizard-navigation.tsx   # Bottom nav (Back/Next/Cancel/Submit)
│   ├── wizard-stepper.tsx      # Desktop step indicators + mobile progress
│   └── index.ts               # Barrel exports
├── tool/                       # Tool layout components (ToolContainer, ToolHeader, ToolFooter)
├── dev-panel/                  # Unified developer panel (localhost-only)
├── ui/                         # shadcn/ui components (22 components)
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
| `address-labels/` | Address label printing with IMb/POSTNET barcodes and mail merge | Yes |
| `dev-panel/` | Unified developer panel showing params, selection, contacts, user tools (localhost-only) | Yes |
| `field-management/` | Drag-and-drop field ordering / inline config editing for MP pages | Yes |
| `group-wizard/` | Multi-step group creation/edit wizard with 6 steps | Yes |
| `template-editor/` | Visual email/document template editor with GrapesJS | Yes |
| `user-menu/` | User dropdown with sign-out | Yes |
| `tool/` | Tool layout components (ToolContainer, ToolHeader, ToolFooter) | Yes |

### Developer Components (Localhost Development Only)

| Folder | Purpose |
|--------|---------|
| `dev-panel/` | Unified overlay showing tool params, selection data, contact records, and authorized tool paths. Auto-rendered by `ToolContainer` when a `params` prop is passed. Gated to localhost and `NODE_ENV === 'development'`. |

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
| address-labels | `address-labels/actions.ts` | `fetchAddressLabels`, `generateLabelPdf`, `generateLabelDocx`, `mergeTemplate` |
| dev-panel | `dev-panel/actions.ts` | `resolveSelection`, `resolveContactRecords`, `getUserTools` |
| group-wizard | `group-wizard/actions.ts` | `fetchGroupWizardLookups`, `searchContacts`, `searchGroups`, `fetchGroupRecord`, `createGroup`, `updateGroup` |
| template-editor | `template-editor/actions.ts` | `compileMjml` |
| user-menu | `user-menu/actions.ts` | `handleSignOut` |
| **shared** | `shared-actions/user.ts` | `getCurrentUserProfile` |

**Shared Actions Folder**: `src/components/shared-actions/` contains actions used across multiple features. See the README in that folder for guidelines on when to use shared vs co-located actions.

## Import Patterns

```typescript
// Tool components (use barrel export)
import { ToolContainer, ToolHeader, ToolFooter } from '@/components/tool';

// UI components (individual imports)
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// Layout components (barrel export)
import { AuthWrapper } from '@/components/layout';

// Address label components (barrel export)
import { AddressLabelsForm, LabelDocument, ImbBarcode } from '@/components/address-labels';

// Template editor components (barrel export)
import { TemplateEditorForm } from '@/components/template-editor';

// Group wizard components (barrel export)
import { StepIdentity, StepOrganization, StepMeeting, WizardStepper } from '@/components/group-wizard';

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

## Quick Reference: Component Responsibilities

### tool
- **Purpose**: Consolidated folder containing reusable layout components for tool interfaces
- **Components**: `ToolContainer`, `ToolHeader`, `ToolFooter`
- **Usage**: Wrap tool content with consistent header/footer styling; `ToolContainer` auto-renders `DevPanel` when `params` prop is passed
- **Pattern**: Composition via children prop
- **Import**: `import { ToolContainer, ToolHeader, ToolFooter } from '@/components/tool';`
- **Note**: Developer panel is auto-rendered and gated to localhost in development builds only

### dev-panel
- **Purpose**: Unified developer overlay for local debugging
- **Features**: Shows parsed URL params, MP selection data, contact record mappings, and authorized tool paths in a collapsible accordion
- **Usage**: Auto-rendered by `ToolContainer` when a `params` prop is passed (no manual scaffolding needed)
- **Gating**: Visible only on localhost (`localhost` / `127.0.0.1`) AND `NODE_ENV === 'development'` — completely invisible in production
- **Persistence**: Open/closed state persists in `localStorage` under `mp-dev-panel:open`
- **Note**: Remove `params={params}` prop from `ToolContainer` to hide the dev panel

### group-wizard
- **Purpose**: Multi-step wizard for creating and editing Ministry Platform groups
- **Features**: 6-step form (Identity, Organization, Meeting, Attributes, Settings, Review), contact/group search, Zod validation per step, edit mode support
- **Service**: Uses `GroupService` for MP group queries and CRUD operations
- **Schema**: Uses react-hook-form with Zod resolver; per-step validation via `STEP_FIELDS` mapping

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
| ToolService | `@/services/toolService` | dev-panel, address-labels |
| UserService | `@/services/userService` | user-menu, shared-actions |
| AddressLabelService | `@/services/addressLabelService` | address-labels |
| GroupService | `@/services/groupService` | group-wizard |

All services ultimately use `MPHelper` from `@/lib/providers/ministry-platform` for API calls.

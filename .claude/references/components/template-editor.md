---
title: Template Editor
domain: components
type: reference
applies_to:
  - src/components/template-editor/index.ts
  - src/components/template-editor/template-editor-form.tsx
  - src/components/template-editor/editor-canvas.tsx
  - src/components/template-editor/editor-toolbar.tsx
  - src/components/template-editor/editor-code-dialog.tsx
  - src/components/template-editor/editor-import-dialog.tsx
  - src/components/template-editor/editor-export-dialog.tsx
  - src/components/template-editor/merge-field-picker.tsx
  - src/components/template-editor/merge-fields.ts
  - src/components/template-editor/grapes-config.ts
  - src/components/template-editor/actions.ts
  - src/components/template-editor/types.ts
  - src/app/(web)/tools/templateeditor/page.tsx
  - src/app/(web)/tools/templateeditor/template-editor.tsx
symbols:
  - TemplateEditorForm
  - EditorCanvas
  - EditorToolbar
  - EditorCodeDialog
  - EditorImportDialog
  - EditorExportDialog
  - MergeFieldPicker
  - MERGE_FIELDS
  - MERGE_FIELD_CATEGORIES
  - getFieldsByCategory
  - registerMergeFieldBlocks
  - createEditorConfig
  - DEFAULT_MJML_TEMPLATE
  - STORAGE_KEY
  - compileMjml
related:
  - ../routing/app-router.md
  - ../data-flow/README.md
last_verified: 2026-04-17
---

## Purpose
Drag-and-drop MJML email template editor built on GrapesJS, with MP merge-field insertion, MJML/HTML code editing, import/export, and localStorage autosave.

## Files

| File | Role |
|---|---|
| `src/components/template-editor/index.ts` | Barrel export — only re-exports `TemplateEditorForm` |
| `src/components/template-editor/template-editor-form.tsx` | Top-level wrapper; dynamic-imports `EditorCanvas` with `ssr: false` and a skeleton fallback |
| `src/components/template-editor/editor-canvas.tsx` | GrapesJS React wrapper (`GjsEditor` + `Canvas`); registers merge-field blocks on ready and loads `DEFAULT_MJML_TEMPLATE` when no saved state |
| `src/components/template-editor/editor-toolbar.tsx` | React toolbar: undo/redo, device toggle (Desktop/Mobile), panel toggles (Blocks/Layers/Styles), code/import/export/merge-field/clear buttons; drives GrapesJS via `useEditor()` |
| `src/components/template-editor/editor-code-dialog.tsx` | Dialog to view/edit MJML source or compiled HTML preview (server-compiled via `compileMjml`) |
| `src/components/template-editor/editor-import-dialog.tsx` | Dialog to paste MJML or JSON editor state and replace canvas content |
| `src/components/template-editor/editor-export-dialog.tsx` | Dialog to export MJML / compiled HTML / GrapesJS JSON project data (copy or download) |
| `src/components/template-editor/merge-field-picker.tsx` | Popover listing merge fields grouped by category; inserts into selected `mj-text` or appends a new `mj-section > mj-column > mj-text` |
| `src/components/template-editor/merge-fields.ts` | `MERGE_FIELDS` list, category helpers, and `registerMergeFieldBlocks(editor)` to add pre-canned merge blocks to GrapesJS Blocks panel |
| `src/components/template-editor/grapes-config.ts` | `createEditorConfig()` — GrapesJS `EditorConfig` factory; `DEFAULT_MJML_TEMPLATE`; `STORAGE_KEY = 'mp-template-editor'` |
| `src/components/template-editor/actions.ts` | `'use server'` — `compileMjml(source)`; auth-gates via `auth.api.getSession`; 500KB cap; dynamic-imports `mjml` |
| `src/components/template-editor/types.ts` | `MjmlCompileResult`, `MjmlCompileError`, `EditorCanvasProps`, `EditorToolbarProps` |
| `src/app/(web)/tools/templateeditor/page.tsx` | Tool route (server) at `/tools/templateeditor`; parses `ToolParams` via `parseToolParams` |
| `src/app/(web)/tools/templateeditor/template-editor.tsx` | `"use client"` shell — `ToolContainer` with `hideFooter`, renders `TemplateEditorForm` |

No test files exist under `src/components/template-editor/` (see TODO `2026-04-17-components-template-editor-missing-tests.md`).

## Key concepts

### GrapesJS integration

- **Packages** (verified in `package.json`):
  - `grapesjs@^0.22.14` — core editor
  - `@grapesjs/react@^2.0.0` — React bindings (`GjsEditor`, `Canvas`, `WithEditor`, `useEditor`)
  - `grapesjs-mjml@^1.0.8` — MJML block/component support
  - `mjml@^4.18.0` + `@types/mjml` — server-side MJML → HTML compilation
- **Client-only**: GrapesJS touches the DOM; `EditorCanvas` is loaded via `next/dynamic` with `ssr: false` from `template-editor-form.tsx:6-15`, and every interactive file starts with `"use client"`.
- **Default panels disabled**: `createEditorConfig()` sets `panels: { defaults: [] }` — the app renders its own React toolbar instead of GrapesJS's built-in chrome.
- **Toolbar drives GrapesJS via commands/managers**: `core:open-blocks`, `core:open-layers`, `core:open-styles-manager` (run/stop), `editor.setDevice`, `editor.UndoManager`, `editor.DomComponents.clear()`, `editor.CssComposer.clear()` (see `editor-toolbar.tsx:84-142`).
- **Sidebar width hack**: Toolbar and canvas-ready code manipulate `.gjs-pn-views-container` and `.gjs-cv-canvas` widths directly (DOM query) to toggle the 240px sidebar (`editor-toolbar.tsx:101-111`, `editor-canvas.tsx:38-41`).
- **Device presets**: `Desktop` 600px, `Mobile` 320px (widthMedia 480px) — `grapes-config.ts:40-50`.
- **Block customization**: `registerMergeFieldBlocks` adds `merge-field-contact` and `merge-field-unsubscribe` blocks; `EditorCanvas` additionally removes `mj-navbar` and `mj-navbar-link` blocks from the default MJML plugin (`editor-canvas.tsx:21-23`).

### Persistence

- **Storage**: GrapesJS `storageManager` type `'local'` with `autosave`, `autoload`, `stepsBeforeSave: 1`, key `STORAGE_KEY = 'mp-template-editor'` (`grapes-config.ts:23-36`).
- **Default template**: If `localStorage.getItem(STORAGE_KEY)` is null on first ready, `editor.setComponents(DEFAULT_MJML_TEMPLATE)` seeds a minimal MJML skeleton (`editor-canvas.tsx:27-35`).
- **Clear**: "Clear Canvas" confirms via `AlertDialog`, then clears components, CSS, undo stack, and removes the localStorage key (`editor-toolbar.tsx:133-142`).
- No MP-side persistence: the editor does not load or save templates to Ministry Platform. The route accepts `ToolParams` (`pageID`, `recordID`) but only displays them in info content — no MP template record is loaded or written.

### Merge fields

- **Token format**: `{{Field_Name}}` (double-brace, snake_case MP column names). Defined in `merge-fields.ts:11-27`.
- **Categories** (from `MERGE_FIELDS`): `Contact`, `Household`, `Church`, `System`.
- **Insertion semantics** (`merge-field-picker.tsx:27-55`):
  - If the selected component is `mj-text`, append the token to its `content`.
  - Otherwise, append a new `mj-section > mj-column > mj-text` into the `mj-body` (or the wrapper if no body exists).
- **No substitution layer** — merge tokens are emitted as literal text in MJML and compiled HTML; there is no code in this directory that resolves them against MP contact data.

### MJML compilation

- Server action `compileMjml(mjmlSource)` (`actions.ts:15-38`):
  - Requires session (`session.user.id`) or throws `Unauthorized`.
  - Rejects empty or >500KB (`MAX_MJML_SIZE = 512_000`) source.
  - Dynamic-imports `mjml` and runs with `validationLevel: 'soft'`, `minify: false`.
  - Returns `{ html, errors: MjmlCompileError[] }` where each error carries `line`, `message`, `tagName`, `formattedMessage`.
- Called from `EditorCodeDialog` (HTML preview tab) and `EditorExportDialog` (HTML tab).

### Import / Export

- **Import** (`editor-import-dialog.tsx`):
  - MJML mode → `editor.setComponents(source)` (replaces content).
  - JSON mode → `JSON.parse` then `editor.loadData(data)`; invalid JSON surfaces a friendly error.
- **Export** (`editor-export-dialog.tsx`):
  - MJML → `editor.getHtml()` (GrapesJS + MJML plugin return MJML source here, not compiled HTML).
  - HTML → server-compiled via `compileMjml`.
  - JSON → `editor.getProjectData()` serialized (copy to clipboard or download `template-state.json` as a Blob).

## API / Interface

```typescript
// template-editor-form.tsx
interface TemplateEditorFormProps {
  onClose: () => void;
}
export function TemplateEditorForm({ onClose }: TemplateEditorFormProps): JSX.Element;

// types.ts
export interface EditorCanvasProps {
  onEditorReady?: (editor: Editor) => void;
  onClose: () => void;
}
export interface EditorToolbarProps {
  onClose: () => void;
}
export interface MjmlCompileResult {
  html: string;
  errors: MjmlCompileError[];
}
export interface MjmlCompileError {
  line: number;
  message: string;
  tagName: string;
  formattedMessage: string;
}

// grapes-config.ts
export const STORAGE_KEY: string;
export const DEFAULT_MJML_TEMPLATE: string;
export function createEditorConfig(): EditorConfig;

// merge-fields.ts
export interface MergeField { label: string; value: string; category: string }
export const MERGE_FIELDS: MergeField[];
export const MERGE_FIELD_CATEGORIES: string[];
export function getFieldsByCategory(category: string): MergeField[];
export function registerMergeFieldBlocks(editor: Editor): void;

// actions.ts ('use server')
export async function compileMjml(mjmlSource: string): Promise<MjmlCompileResult>;
```

## How it works

- `/tools/templateeditor` (server) → `TemplateEditor` (client shell with `ToolContainer`) → `TemplateEditorForm` → dynamic `EditorCanvas` (SSR disabled).
- `EditorCanvas` mounts `GjsEditor` with `grapesjs`, `grapesjsMjml` plugin, and config from `createEditorConfig()`.
- On `onReady(editor)`:
  1. Stash editor in `useRef`.
  2. `registerMergeFieldBlocks(editor)`.
  3. Remove `mj-navbar`, `mj-navbar-link` blocks.
  4. If no saved state, seed `DEFAULT_MJML_TEMPLATE`.
  5. Set canvas width to leave 240px for the sidebar.
- `EditorToolbar` (wrapped in `<WithEditor>`) reads `useEditor()` and drives command execution, UndoManager polling via `change:changesCount`, device switching, and dialog opening.
- Server action `compileMjml` is called only from the two dialogs (code-dialog, export-dialog).

## Usage

Barrel import (the only public entry point):

```typescript
// src/app/(web)/tools/templateeditor/template-editor.tsx:5
import { TemplateEditorForm } from "@/components/template-editor";
```

Tool shell:

```typescript
// src/app/(web)/tools/templateeditor/template-editor.tsx:12-42
export function TemplateEditor({ params }: TemplateEditorProps) {
  const router = useRouter();
  const handleClose = () => { router.back(); };
  return (
    <ToolContainer
      params={params}
      title="Template Editor"
      infoContent={/* ... */}
      hideFooter
    >
      <TemplateEditorForm onClose={handleClose} />
    </ToolContainer>
  );
}
```

Server-compile MJML from a client component:

```typescript
// src/components/template-editor/editor-code-dialog.tsx:40-54
const handleCompileHtml = async () => {
  setIsCompiling(true);
  setCompileErrors([]);
  try {
    const result = await compileMjml(mjmlSource);
    setHtmlPreview(result.html);
    if (result.errors.length > 0) {
      setCompileErrors(result.errors.map((e) => e.formattedMessage));
    }
  } catch (err) {
    setCompileErrors([err instanceof Error ? err.message : 'Compilation failed']);
  } finally {
    setIsCompiling(false);
  }
};
```

## Gotchas

- **GrapesJS must be client-only.** It touches `window`/DOM on construction. `EditorCanvas` is loaded via `next/dynamic` with `ssr: false` in `template-editor-form.tsx:6-15`; every component file that references `grapesjs`/`@grapesjs/react` begins with `"use client"`. Importing `editor-canvas.tsx` from a server component or removing the dynamic wrapper will break SSR.
- **Merge tokens are literal `{{Field_Name}}` strings.** No component in this directory resolves them. They survive MJML → HTML compilation unchanged and must be substituted by a downstream consumer (not implemented in-tree at this SHA).
- **Route uses `ToolParams` but ignores them.** `pageID` and `recordID` from query string are shown in info content only; no MP template record is fetched or saved. Users landing here from an MP page context will not see their template auto-loaded.
- **Autosave is local-only.** State persists to `localStorage['mp-template-editor']` on the user's browser. Clearing browser storage or switching devices discards work; there is no server-side save.
- **Direct DOM queries for sidebar width.** `editor-toolbar.tsx:101-111` and `editor-canvas.tsx:38-41` reach into `.gjs-pn-views-container` and `.gjs-cv-canvas` via `document.querySelector`. Fragile against GrapesJS class-name changes.
- **Toolbar's `.test-html-..` mock class** *(not applicable)*.
- **`editor.getHtml()` returns MJML source**, not HTML — because the MJML plugin overrides that method. Used in both `EditorCodeDialog` and `EditorExportDialog` to expose the MJML tree. Compile via `compileMjml` for real HTML.
- **No tests** for this directory (37 test files project-wide, none under `template-editor/`). See TODO.

## Related docs

- `../routing/app-router.md` — tool route conventions (`/tools/<slug>`) and `ToolParams` usage
- `../data-flow/README.md` — server-action pattern used by `compileMjml`

---

```json
{
  "shard": "components-template-editor",
  "docs_written": [".claude/references/components/template-editor.md"],
  "todos_dropped": [
    ".claude/TODO/2026-04-17-components-template-editor-missing-tests.md",
    ".claude/TODO/2026-04-17-components-template-editor-no-mp-persistence.md",
    ".claude/TODO/2026-04-17-components-template-editor-merge-token-resolver.md"
  ],
  "glossary_terms": [
    {"term": "GrapesJS", "aliases": ["grapesjs", "@grapesjs/react"], "definition": "Client-only drag-and-drop visual editor used for the template editor; wrapped via next/dynamic with ssr:false.", "defined_in": "src/components/template-editor/editor-canvas.tsx:4"},
    {"term": "MJML", "aliases": [], "definition": "Responsive-email markup language; source is edited in GrapesJS and server-compiled to HTML via the mjml package in compileMjml.", "defined_in": "src/components/template-editor/actions.ts:22"},
    {"term": "Merge field", "aliases": ["merge token"], "definition": "Template placeholder written as {{Field_Name}} using MP column names; inserted via MergeFieldPicker and emitted literally into compiled HTML (no in-tree resolver).", "defined_in": "src/components/template-editor/merge-fields.ts:11"},
    {"term": "MJML default template", "aliases": ["DEFAULT_MJML_TEMPLATE"], "definition": "Minimal mjml/mj-body/mj-section skeleton seeded into the canvas when no localStorage state exists.", "defined_in": "src/components/template-editor/grapes-config.ts:5"}
  ],
  "gotchas": [
    {"symptom": "SSR/build error 'window is not defined' or 'ReferenceError: document' when loading /tools/templateeditor", "root_cause": "GrapesJS touches DOM at import time and cannot run under Node SSR.", "fix": "Import EditorCanvas via next/dynamic with ssr:false (as in template-editor-form.tsx) and keep `\"use client\"` on every file that imports grapesjs or @grapesjs/react.", "enforced_where": "src/components/template-editor/template-editor-form.tsx:6"},
    {"symptom": "Merge tokens like {{First_Name}} appear verbatim in sent emails", "root_cause": "The template-editor directory contains no token resolver; tokens are emitted literally by MJML compilation.", "fix": "Resolve tokens in a downstream send/render pipeline before delivery, or add a resolver in a new service.", "enforced_where": "src/components/template-editor/merge-fields.ts:9"},
    {"symptom": "User's saved template disappears after clearing browser data or switching devices", "root_cause": "GrapesJS storageManager is configured as type:'local' (localStorage only) with key 'mp-template-editor'; no server persistence.", "fix": "Either add MP-side save/load using the route's ToolParams, or warn users in the UI that storage is local-only.", "enforced_where": "src/components/template-editor/grapes-config.ts:23"},
    {"symptom": "Export 'MJML' tab shows MJML, not HTML, despite calling editor.getHtml()", "root_cause": "The grapesjs-mjml plugin overrides getHtml() to return MJML source.", "fix": "Use compileMjml server action (as EditorExportDialog HTML tab does) to obtain real HTML.", "enforced_where": "src/components/template-editor/editor-export-dialog.tsx:33"}
  ],
  "adrs": [
    {"title": "Client-only GrapesJS via next/dynamic(ssr:false)", "context": "GrapesJS and @grapesjs/react are DOM-bound and cannot run under Node SSR.", "decision": "Wrap EditorCanvas in next/dynamic with ssr:false and a Skeleton fallback; mark every editor file as `\"use client\"`.", "consequences": "No SSR for the editor; initial paint shows skeleton then hydrates. Keeps the rest of the tools route server-rendered.", "alternatives": "Conditional import inside useEffect (rejected — harder to type and worse DX)."},
    {"title": "Local-only template persistence (Phase 1)", "context": "Phase 1 of the template editor did not yet have MP-side save/load.", "decision": "Use GrapesJS storageManager type:'local' with key 'mp-template-editor'; autosave on every change step.", "consequences": "Work is tied to browser storage; no multi-device or multi-user persistence; no MP template integration despite tool route exposing pageID/recordID.", "alternatives": "MP REST storage via a dedicated service (deferred)."},
    {"title": "Server-side MJML compilation instead of bundling in the client", "context": "MJML compiler is heavy and not intended for browser use.", "decision": "Expose compileMjml as a `'use server'` action with auth gate and 500KB cap; dynamic-import mjml inside the handler.", "consequences": "Compilation requires a round-trip and an authenticated session; keeps client bundle small.", "alternatives": "Use mjml-browser in the client (rejected — bundle size)."}
  ],
  "call_graphs": [
    {"name": "template-editor-render", "hint": "entry: src/app/(web)/tools/templateeditor/page.tsx:TemplateEditorPage → src/app/(web)/tools/templateeditor/template-editor.tsx:TemplateEditor → src/components/template-editor/template-editor-form.tsx:TemplateEditorForm → dynamic import src/components/template-editor/editor-canvas.tsx:EditorCanvas → @grapesjs/react:GjsEditor + grapesjs + grapesjs-mjml"},
    {"name": "mjml-compile", "hint": "entry: src/components/template-editor/editor-code-dialog.tsx:handleCompileHtml (and editor-export-dialog.tsx:handleCompile) → src/components/template-editor/actions.ts:compileMjml (`'use server'`) → auth.api.getSession → dynamic import('mjml') → mjml2html"},
    {"name": "merge-field-insert", "hint": "entry: src/components/template-editor/merge-field-picker.tsx:handleInsertField → editor.getSelected | editor.getWrapper → component.append({type:'mj-section'...}) (no server call)"}
  ],
  "errors": [
    {"layer": "oauth", "type": "Unauthorized (thrown Error when session is missing)", "thrown_at": "src/components/template-editor/actions.ts:9", "caught_at": "src/components/template-editor/editor-code-dialog.tsx:49 (try/catch in handleCompileHtml)"},
    {"layer": "validation", "type": "MJML size guard (empty or >500KB)", "thrown_at": "src/components/template-editor/actions.ts:19", "caught_at": "src/components/template-editor/editor-code-dialog.tsx:49, src/components/template-editor/editor-export-dialog.tsx:54"},
    {"layer": "client-fetch", "type": "Invalid JSON import", "thrown_at": "src/components/template-editor/editor-import-dialog.tsx:36 (JSON.parse throws)", "caught_at": "src/components/template-editor/editor-import-dialog.tsx:36 (try/catch sets error state)"}
  ],
  "cross_refs_needed": [
    "routing/app-router.md",
    "data-flow/README.md"
  ],
  "critical_flag": null
}
```

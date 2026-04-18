---
title: Template editor ignores pageID/recordID and never saves to MP
severity: medium
tags: [bug, drift]
area: components
files:
  - src/app/(web)/tools/templateeditor/template-editor.tsx
  - src/components/template-editor/grapes-config.ts
  - src/components/template-editor/template-editor-form.tsx
  - src/components/template-editor/actions.ts
discovered: 2026-04-17
discovered_by: components-template-editor
status: open
---

## Problem
The `/tools/templateeditor` route accepts `ToolParams` (`pageID`, `recordID`) via `parseToolParams` and displays them in the info popover, but no code loads an MP template record on mount or writes changes back. `grapes-config.ts` hard-codes `storageManager.type = 'local'` with a single shared key `'mp-template-editor'`, so every user and every invocation (regardless of `pageID`/`recordID`) shares the same browser-local draft. The in-doc comment states "Storage: localStorage for Phase 1" — this is drift between the tool's apparent contract (MP-integrated template tool) and its actual behavior (browser-scratchpad).

Users opening the tool from a specific MP page/record will:
- Not see that template loaded.
- Overwrite their unrelated local draft if they start editing.
- Lose all work on browser-data clear or device switch.
- Have no way to save changes to MP.

## Evidence
- `src/app/(web)/tools/templateeditor/template-editor.tsx:28-35` — `params.pageID` and `params.recordID` are only rendered as text; no fetch.
- `src/components/template-editor/grapes-config.ts:23-36` — `storageManager: { type: 'local', ..., options: { local: { key: STORAGE_KEY } } }` with a constant key.
- `src/components/template-editor/actions.ts` — only exports `compileMjml`; no `loadTemplate`/`saveTemplate` actions.
- `src/components/template-editor/editor-canvas.tsx:27-35` — seeds `DEFAULT_MJML_TEMPLATE` when localStorage is empty, regardless of route params.

## Proposed fix
Choose one of:

1. **MP-integrated persistence** (preferred for a "Template Editor" tool):
   - Add server actions `loadTemplate(pageID, recordID)` and `saveTemplate(pageID, recordID, mjml)` in `src/components/template-editor/actions.ts` backed by a new `TemplateService` or an existing MP table (e.g., a `Templates` / `Email_Templates` entity — pick per MP schema).
   - Thread `params` from `TemplateEditor` into `TemplateEditorForm`/`EditorCanvas` so it loads on mount and saves on explicit action (replace or complement autosave).
   - Scope the localStorage key by `pageID`/`recordID` or disable local storage once server persistence is in place.

2. **UI honesty** (minimum): update the info popover + tool copy to say "browser-local drafts only; MP save coming in a later phase," and hide the `pageID`/`recordID` line since they have no effect.

## Impact if not fixed
- Users lose work unexpectedly.
- Multiple users on a shared workstation clobber each other's drafts.
- Expectations set by the tool's info text ("Create and edit email templates") don't match behavior — credibility and support cost.

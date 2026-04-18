---
title: Merge tokens {{Field_Name}} have no resolver anywhere in-tree
severity: medium
tags: [bug, refactor]
area: components
files:
  - src/components/template-editor/merge-fields.ts
  - src/components/template-editor/merge-field-picker.tsx
  - src/components/template-editor/actions.ts
discovered: 2026-04-17
discovered_by: components-template-editor
status: open
---

## Problem
`MergeFieldPicker` inserts tokens of the form `{{First_Name}}`, `{{Email_Address}}`, `{{Unsubscribe_URL}}`, etc., into MJML content. `compileMjml` passes the tokens through as literal text — the HTML output still contains `{{...}}`. Nothing in `src/components/template-editor/`, `src/lib/`, or the services layer replaces these tokens with contact data before send or export. A user generating HTML from this tool and pasting it into a mail client will send literal `{{First_Name}}` to recipients.

## Evidence
- `src/components/template-editor/merge-fields.ts:11-27` — tokens defined as plain `{{...}}` strings.
- `src/components/template-editor/merge-field-picker.tsx:27-55` — insertion writes the raw token into component content.
- `src/components/template-editor/actions.ts:15-38` — `compileMjml` only calls `mjml2html`; no token substitution.
- `Grep "{{First_Name}}" src/` — only appears in template-editor sources (definition + test fixtures if any); no resolver.

## Proposed fix
1. Define a token resolver: `resolveMergeTokens(html: string, ctx: { contact, household, congregation, system }): string` — can live in a new `src/lib/merge-tokens.ts` or as a service method.
2. Invoke it at the point of use:
   - If sending email from this tool → call after `compileMjml` before dispatch.
   - If exporting for downstream MP use → document that MP's mail merge is the resolver and keep tokens literal.
3. Add a coverage table mapping each `MERGE_FIELDS` entry to its source (MP column / computed value) so drift between the picker list and the resolver is catchable in tests.
4. Until a resolver lands, either:
   - Put a visible banner in `EditorExportDialog` noting "tokens will not be resolved by this export," or
   - Compile a warning list in `EditorCodeDialog`/`EditorExportDialog` showing unresolved tokens in the current output.

## Impact if not fixed
- Silent data-quality bug: recipients receive emails with literal `{{First_Name}}`.
- The "Merge Fields" feature is misleading — the picker implies substitution happens.
- Adding a resolver later without tests will risk resolver ↔ picker drift (new tokens in the picker, none in the resolver).

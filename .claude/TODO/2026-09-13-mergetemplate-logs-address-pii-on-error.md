---
title: mergeTemplate (and sibling actions) console.error the raw docxtemplater error, which can carry household addresses
severity: high
tags: [security, bug]
area: components
files: [src/components/address-labels/actions.ts]
discovered: 2026-09-13
discovered_by: coverage-agent-address-labels
status: open
---

## Problem

CLAUDE.md rule 14 requires that errors log "identifiers and shape" only — never
record content — "including inside thrown error messages, which travel further
than logs do." `mergeTemplate` (and its siblings `generateLabelPdf` /
`generateLabelDocx`) violate this by passing the entire caught `error` object to
`console.error`, not just `error.message`.

For `mergeTemplate` this is a concrete PII leak, not a theoretical one:
docxtemplater's scope-parser error path attaches the live merge scope object to
`err.properties.scope` (see `node_modules/docxtemplater/js/errors.js:593-600`,
function that throws `"scopeparser_execution_failed"`). In this feature, the
merge scope is exactly the `addresses` array built in `mergeTemplate` — each
entry carries `Name`, `AddressLine1`, `AddressLine2`, `City`, `State`,
`PostalCode` for a real household. A user-uploaded template with a malformed
tag (e.g. a token that calls a method that throws, or a bad expression) causes
docxtemplater to throw with that scope attached, and
`console.error('mergeTemplate error:', error)` writes the full object —
including the nested `.properties.scope` with every printable household's
name and address — to server logs.

## Evidence

- `src/components/address-labels/actions.ts:328` — `console.error('mergeTemplate error:', error);` logs the raw `error`, not `error.message`.
- `src/components/address-labels/actions.ts:189` and `:232` — same pattern for `generateLabelPdf` / `generateLabelDocx` (lower risk here, but same anti-pattern).
- `node_modules/docxtemplater/js/errors.js:593-601` — `err.properties.scope = scope;` attaches the full render scope (the caller's data) to certain template errors.
- `mergeTemplate`'s `addresses` array (`actions.ts:286-296`) contains `Name`, `AddressLine1`, `AddressLine2`, `City`, `State`, `PostalCode` — real household PII — which is exactly what would appear in that scope.

## Proposed fix

Log only identifiers/shape, per rule 14: e.g.
```ts
console.error('mergeTemplate error:', error instanceof Error ? error.message : 'non-Error thrown');
```
or, if the `docxtemplater` error's `.properties.id`/`.name` is useful for
diagnosing which failure mode occurred, log those specific fields explicitly
rather than the object itself — never `error` or `error.properties` in bulk.
Apply the same change to the `console.error` calls in `generateLabelPdf` and
`generateLabelDocx` for consistency and defense in depth.

## Impact if not fixed

Any user who uploads a mail-merge template with a tag that fails docxtemplater's
scope parser causes every printable household's name and mailing address for
that batch to be written to application/server logs (e.g. Vercel function
logs), which are typically retained, more widely readable, and less access
controlled than the MP database itself.

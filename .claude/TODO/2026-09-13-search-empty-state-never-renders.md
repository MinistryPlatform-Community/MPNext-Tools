---
title: "Add/Edit Family search: 'No contacts found' empty state never renders"
severity: low
tags: [bug]
area: components
files: [src/app/(web)/tools/addeditfamily/add-edit-family.tsx]
discovered: 2026-09-13
discovered_by: coverage-agent-addeditfamily
status: open
---

## Problem
`FamilySearchBar` (in `add-edit-family.tsx`) renders a `<CommandEmpty>No contacts
found.</CommandEmpty>` whenever the query is at least 2 characters and
`searchContacts` returned zero results. In practice this text never appears in
the DOM, because `cmdk`'s `CommandEmpty` only renders when the command's
*global* registered-item count (`filtered.count`, tracked across the whole
`Command` tree, not just the group it lives in) is zero. The sibling "Or"
`CommandGroup` always registers a `+ New Family with last name "…"` item as
soon as the query is >= 2 characters, so that count is never zero, and
`CommandEmpty` unconditionally returns `null` regardless of our own
`results.length === 0` check.

Net effect: a user who searches for a name with no matches sees only the
"+ New Family" suggestion, with no indication that the search itself came up
empty (they may not notice there's a difference between "no matches" and
"you haven't typed enough").

## Evidence
- `src/app/(web)/tools/addeditfamily/add-edit-family.tsx:457-459` — the
  `CommandEmpty` block, gated on local `results`/`query` state.
- `node_modules/cmdk/dist/index.mjs` — `CommandEmpty` (`Ie`) renders based on
  `useCommandState(v => v.filtered.count === 0)`, and `filtered.count` is
  computed from `shouldFilter === false` as `u.current.size` (total item
  registrations), not scoped to a single `CommandGroup`.
- `src/app/(web)/tools/addeditfamily/add-edit-family.test.tsx` — the test
  `"finds no CommandEmpty text when the search returns nothing"` documents and
  asserts this actual (broken) behavior instead of the intended message.

## Proposed fix
Don't rely on `CommandEmpty`'s built-in visibility heuristic here. Replace it
with an explicit conditional `<div>` (matching the style already used for the
"Type at least 2 characters" and "Searching…" states a few lines above) that
renders whenever `!isSearching && query.trim().length >= 2 && results.length
=== 0`, instead of wrapping the message in `<CommandEmpty>`.

## Impact if not fixed
Cosmetic/UX only — the "+ New Family" path still works, so no data is lost or
corrupted. A user searching for an existing family that doesn't actually exist
gets a slightly less clear affordance (no explicit "not found" feedback), but
can still proceed by creating a new family.

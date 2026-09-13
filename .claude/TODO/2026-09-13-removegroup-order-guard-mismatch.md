---
title: removeGroup drops a non-empty group's fields from the save payload
severity: high
tags: [bug]
area: components
files: [src/components/field-management/use-field-order-state.ts]
discovered: 2026-09-13
discovered_by: coverage-agent-field-management
status: resolved
---

## Problem

`removeGroup(name)` in `use-field-order-state.ts` guards `groupedFields` against
removing a group that still has fields, but does not apply the same guard to
`groupOrder`. The two state updates run independently:

```ts
const removeGroup = useCallback((name: string) => {
  setGroupedFields((prev) => {
    if ((prev[name] || []).length > 0) return prev;   // <-- guarded: no-op if non-empty
    const { [name]: _, ...rest } = prev;
    return rest;
  });
  setGroupOrder((prev) => prev.filter((g) => g !== name));  // <-- unconditional
  setIsDirty(true);
}, []);
```

If a caller invokes `removeGroup` on a group that still has fields (the UI's
trash-can button is only rendered for empty groups, but `removeGroup` is a
plain callback with no such enforcement — any other call site, a future UI
change, or a test/automation calling the hook directly can hit this), the
group's fields survive in `groupedFields` but the group name is removed from
`groupOrder`.

`buildSavePayload()` iterates `groupOrder` (not `Object.keys(groupedFields)`)
to build the save payload:

```ts
for (const groupName of groupOrder) {
  const fieldIds = groupedFields[groupName] || [];
  ...
}
```

Because the group name is no longer in `groupOrder`, its fields are silently
skipped — they never appear in the payload sent to
`savePageFieldOrder`/`api_Tools_...` stored proc. Since this feature writes
live Ministry Platform page field configuration, this is a silent
configuration-loss bug: fields simply vanish from the page's field list on
next save, with no error or warning to the user.

## Evidence

- `src/components/field-management/use-field-order-state.ts:123-130` (removeGroup)
- `src/components/field-management/use-field-order-state.ts:222-223` (buildSavePayload
  iterates `groupOrder`, using `groupedFields[groupName] || []` as a fallback for
  names no longer present)
- Reproduced in
  `src/components/field-management/use-field-order-state.test.ts`, describe
  block `useFieldOrderState > removeGroup`, test `'is a no-op on groupedFields
  when the group still has fields, but still removes it from groupOrder'`:
  after calling `removeGroup('1 - First')` on a group with one field, the test
  asserts `groupedFields['1 - First']` still equals `[1]` but
  `buildSavePayload()`'s output has no entry for that field at all.

## Proposed fix

Make the two updates consistent — either:
1. Only remove from `groupOrder` when the group was actually empty (mirror the
   same guard used for `groupedFields`), or
2. If `removeGroup` is meant to force-delete a non-empty group (moving its
   fields elsewhere, e.g. into "99 - Other Fields"), do that explicitly instead
   of silently orphaning the fields.

Given the existing UI only calls `removeGroup` for empty groups (see
`sortable-group.tsx`'s trash button, rendered only when `fieldIds.length ===
0`), option 1 (guard `groupOrder` the same way) is the minimal, safe fix and
matches the function's only current call site's expectations.

## Impact if not fixed

Any caller of `removeGroup` on a non-empty group — now or in a future UI
change — silently drops that group's fields from the next save, with no error
surfaced to the admin performing the edit. This directly corrupts live
Ministry Platform page field configuration (view order, group assignment,
required/hidden/filter settings all lost for the affected fields) until
someone notices fields missing from the page and manually re-adds them.

---

## Resolution (2026-09-13)
Applied option 1 from the proposed fix: `groupOrder` is now guarded the same
way `groupedFields` was, so a non-empty group is a complete no-op.

The guard moved OUT of the `setGroupedFields` updater and up to the top of the
callback, reading the rendered `groupedFields` (added to the dependency array,
matching how `addGroup` already reads `isFlat`):

```ts
const removeGroup = useCallback(
  (name: string) => {
    if ((groupedFields[name] || []).length > 0) return;
    setGroupedFields((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setGroupOrder((prev) => prev.filter((g) => g !== name));
    setIsDirty(true);
  },
  [groupedFields],
);
```

### A wrong first attempt, recorded so it is not retried
The obvious fix — set a `let removed = false` flag inside the
`setGroupedFields` updater and check it before calling `setGroupOrder` — does
not work. React runs state updaters during the render phase, not synchronously
at call time, so the flag is still `false` when the second setter is reached.
It would have looked correct, passed a casual read, and silently kept the bug.
The decision has to be made once, up front, from state both setters agree on.

`isDirty` is no longer set when the removal is refused: nothing changed, so
there is nothing to save.

### Tests
`src/components/field-management/use-field-order-state.test.ts` — the test that
documented the broken behaviour was replaced with four that pin the fix: both
halves of state left intact, fields still present in `buildSavePayload()`,
`isDirty` untouched on refusal, and a group still removable once emptied (with
its field surviving).

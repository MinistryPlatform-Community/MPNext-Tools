---
title: removeGroup drops a non-empty group's fields from the save payload
severity: high
tags: [bug]
area: components
files: [src/components/field-management/use-field-order-state.ts]
discovered: 2026-09-13
discovered_by: coverage-agent-field-management
status: open
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

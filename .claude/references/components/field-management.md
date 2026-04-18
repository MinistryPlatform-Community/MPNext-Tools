---
title: Field Management component
domain: components
type: reference
applies_to:
  - src/components/field-management/actions.ts
  - src/components/field-management/actions.test.ts
  - src/components/field-management/field-order-editor.tsx
  - src/components/field-management/index.ts
  - src/components/field-management/new-group-dialog.tsx
  - src/components/field-management/page-search.tsx
  - src/components/field-management/sortable-field-item.tsx
  - src/components/field-management/sortable-group.tsx
  - src/components/field-management/types.ts
  - src/components/field-management/use-field-order-state.ts
symbols:
  - PageSearch
  - FieldOrderEditor
  - NewGroupDialog
  - SortableGroup
  - SortableFieldItem
  - useFieldOrderState
  - fetchPages
  - fetchPageFieldData
  - savePageFieldOrder
  - PageListItem
  - PageField
  - PageFieldData
  - FieldOrderPayload
  - FieldOrderEditorHandle
related:
  - ../services/field-management-service.md
  - ../mp-schema/required-procs.md
  - tool-framework.md
last_verified: 2026-04-17
---

## Purpose
Drag-and-drop editor for Ministry Platform page field layout: pick a page, reorder fields, move them between groups, toggle `Required` / `Hidden` / `Writing_Assistant_Enabled`, and persist changes back to `dp_Page_Fields`. Consumed by the `/tools/fieldmanagement` tool page.

## Files
| File | Role |
|---|---|
| `src/components/field-management/index.ts` | Barrel export — re-exports `PageSearch`, `FieldOrderEditor`, and shared types |
| `src/components/field-management/types.ts` | `PageListItem`, `PageField`, `PageFieldData`, `FieldOrderPayload`, `FieldOrderEditorHandle` interfaces |
| `src/components/field-management/actions.ts` | Server actions: `fetchPages`, `fetchPageFieldData`, `savePageFieldOrder` |
| `src/components/field-management/actions.test.ts` | Vitest tests for the three server actions |
| `src/components/field-management/page-search.tsx` | Combobox (Popover + cmdk) for picking a MP page; loads list via `fetchPages` |
| `src/components/field-management/field-order-editor.tsx` | `forwardRef` editor shell — renders flat or grouped mode, wires `DragDropProvider`, exposes `getSavePayload` / `moveHiddenToOther` via `useImperativeHandle` |
| `src/components/field-management/use-field-order-state.ts` | Hook owning groupedFields map, groupOrder list, fieldLookup, `isDirty`, DnD handlers, `addGroup`/`removeGroup`/`moveHiddenToOther`/`buildSavePayload` |
| `src/components/field-management/sortable-group.tsx` | `@dnd-kit/react` sortable group container (header, collapse, delete-empty) |
| `src/components/field-management/sortable-field-item.tsx` | Sortable field row with expandable detail panel (label / default / filter / depends-on / switches) |
| `src/components/field-management/new-group-dialog.tsx` | Dialog for creating a new group (validates name, rejects duplicates case-insensitively) |

Tool page consumer: `src/app/(web)/tools/fieldmanagement/field-management.tsx`.

## Key concepts
- **Page field**: a row in `dp_Page_Fields` describing how one column is presented on a given MP page (order, group, required, hidden, label, default, filter, depends-on, writing-assistant flag).
- **Flat vs grouped mode**: if every incoming field has `Group_Name === null` the hook stores them under the sentinel key `"__flat__"` (constant `FLAT_GROUP`, `use-field-order-state.ts:8`) and renders a single list. Adding a group transitions to grouped mode — flat fields move into `"99 - Other Fields"`.
- **`"99 - Other Fields"` pinned bucket**: constant `OTHER_FIELDS_GROUP` (`field-order-editor.tsx:14`, `use-field-order-state.ts:9`). Always rendered last, cannot be dragged (`isPinned` disables its sortable handle), cannot be removed, and catches fields the user marks Hidden when they click **Move Hidden to Other**.
- **Negative `Page_Field_ID`**: `fetchPageFieldData` merges table columns that aren't in `dp_Page_Fields` yet and assigns them synthetic IDs starting at `-1` and decrementing (`actions.ts:35`). These IDs only exist client-side as React keys — the save payload is keyed by `Page_ID + Field_Name`, not ID.
- **Group renumbering on save**: `buildSavePayload` strips any `^\d+\s*-\s*` prefix and re-emits groups as `"1 - …"`, `"2 - …"`, … in current display order; `"99 - Other Fields"` keeps its literal name and `"__flat__"` becomes `Group_Name: null` (`use-field-order-state.ts:176-215`).
- **Schema-required lock**: when `tableMetadata.Columns[n].IsRequired` is true, the field's `Required` switch is forced on and disabled (`sortable-field-item.tsx:126-134`). The badge also shows "Required" based on `schemaRequired || field.Required`.
- **Imperative handle**: parent tool page keeps an editor `ref` and calls `ref.current.getSavePayload()` before invoking `savePageFieldOrder`; `ref.current.moveHiddenToOther()` powers the footer button.

## API / Interface

### Server actions — `actions.ts`
```typescript
// src/components/field-management/actions.ts:14
export async function fetchPages(): Promise<PageListItem[]>

// src/components/field-management/actions.ts:20
export async function fetchPageFieldData(pageId: number, tableName: string): Promise<PageFieldData>

// src/components/field-management/actions.ts:61
export async function savePageFieldOrder(
  fields: FieldOrderPayload[]
): Promise<{ success: boolean; error?: string }>
```
All three call the internal `getSession()` guard (`actions.ts:8-12`), which throws `Error('Unauthorized')` when `session.user.id` is missing. `savePageFieldOrder` catches errors and returns `{ success: false, error }`; the other two let `Unauthorized` propagate.

### Types — `types.ts`
```typescript
// src/components/field-management/types.ts:3
export interface PageListItem {
  Page_ID: number;
  Display_Name: string;
  Table_Name: string;
}

// src/components/field-management/types.ts:9
export interface PageField {
  Page_Field_ID: number;
  Page_ID: number;
  Field_Name: string;
  Group_Name: string | null;
  View_Order: number;
  Required: boolean;
  Hidden: boolean;
  Default_Value: string | null;
  Filter_Clause: string | null;
  Depends_On_Field: string | null;
  Field_Label: string | null;
  Writing_Assistant_Enabled: boolean;
}

// src/components/field-management/types.ts:24
export interface PageFieldData {
  fields: PageField[];
  tableMetadata: TableMetadata | null;
}

// src/components/field-management/types.ts:29
export interface FieldOrderPayload { /* same shape as PageField minus Page_Field_ID */ }

// src/components/field-management/types.ts:43
export interface FieldOrderEditorHandle {
  getSavePayload: () => FieldOrderPayload[];
  moveHiddenToOther: () => void;
}
```

### Components
| Symbol | File | Props / signature |
|---|---|---|
| `PageSearch` | `page-search.tsx:28` | `{ value?: PageListItem; onSelect: (p: PageListItem) => void }` |
| `FieldOrderEditor` | `field-order-editor.tsx:22` | `forwardRef<FieldOrderEditorHandle, { fields: PageField[]; tableMetadata: TableMetadata \| null; onDirtyChange: (dirty: boolean) => void }>` |
| `NewGroupDialog` | `new-group-dialog.tsx:23` | `{ open, onOpenChange, onCreateGroup: (name) => void, existingGroupNames: string[] }` |
| `SortableGroup` | `sortable-group.tsx:22` | `{ groupName, index, fieldIds, fieldLookup, isPinned, onRemove, onUpdateField, schemaRequiredFields }` |
| `SortableFieldItem` | `sortable-field-item.tsx:19` | `{ field, index, groupName, onUpdateField, schemaRequired }` |
| `useFieldOrderState` | `use-field-order-state.ts:30` | `(fields: PageField[]) => FieldOrderState` — see the interface at `use-field-order-state.ts:14-28` |

### Service delegation
`actions.ts` calls `FieldManagementService.getInstance()` for all three operations:

| Action | Service method | Stored proc / API |
|---|---|---|
| `fetchPages` | `service.getPages()` | `api_MPNextTools_GetPages` |
| `fetchPageFieldData` | `Promise.all([service.getPageFields(pageId), service.getTableMetadata(tableName)])` | `api_MPNextTools_GetPageFields` + `MPHelper.getTables()` |
| `savePageFieldOrder` | `service.updatePageFieldOrder(fields)` | `api_MPNextTools_UpdatePageFieldOrder` (batched 5 at a time) |

See [`../services/field-management-service.md`](../services/field-management-service.md) for service internals and [`../mp-schema/required-procs.md`](../mp-schema/required-procs.md) for stored-procedure parameters.

## How it works
- **Step 1 — page select**: tool page renders `PageSearch`; `fetchPages` runs once (guarded by `fetchedRef`, `page-search.tsx:32,36-42`) and caches the full page list in component state. Selection triggers `fetchPageFieldData` and advances to step 2.
- **Merge pass**: `fetchPageFieldData` (`actions.ts:30-56`) fetches existing `dp_Page_Fields` rows and the table metadata in parallel, then appends any `tableMetadata.Columns` that (a) aren't `IsPrimaryKey` and (b) aren't already in the returned fields. New entries get negative IDs, `View_Order = maxViewOrder + 1 + n`, `Required = col.IsRequired`, and all other props defaulted.
- **Hook initialization**: `initializeGroupedFields` (`use-field-order-state.ts:234-259`) checks whether any field has a non-null `Group_Name`; if not → flat mode, otherwise bucket by group and sort each bucket by `View_Order`. `initializeGroupOrder` (`use-field-order-state.ts:261-283`) sorts group names by the minimum `View_Order` of their members, and pins `"99 - Other Fields"` last.
- **Drag lifecycle**: `handleDragStart` snapshots both structures (`use-field-order-state.ts:54-59`), `handleDragOver` applies `@dnd-kit/helpers`' `move()` to `groupedFields` on every item drag and no-ops for group drags (`use-field-order-state.ts:62-66`), `handleDragEnd` either restores the snapshot on cancel or — for group drags — re-runs `move()` on `groupOrder` and re-pins `"99 - Other Fields"` last (`use-field-order-state.ts:69-92`).
- **Dirty tracking**: every state mutator (`addGroup`, `removeGroup`, `moveHiddenToOther`, `updateField`, and any non-canceled drag) sets `isDirty = true`. `FieldOrderEditor` forwards it through `onDirtyChange`; the tool page shows an "Unsaved changes" pill and clears it after a successful save + re-fetch.
- **Save flow**: tool page calls `editorRef.current.getSavePayload()` → `savePageFieldOrder(payload)`. On success it toasts, re-fetches via `fetchPageFieldData` so synthetic negative IDs are replaced with real persisted IDs, and resets `isDirty`.

## Usage
From the tool page (`src/app/(web)/tools/fieldmanagement/field-management.tsx:19-67`):

```typescript
const editorRef = useRef<FieldOrderEditorHandle>(null);

const handlePageSelect = useCallback(async (page: PageListItem) => {
  setSelectedPage(page);
  setStep(2);
  setIsLoadingFields(true);
  setIsDirty(false);
  try {
    const data = await fetchPageFieldData(page.Page_ID, page.Table_Name);
    setFieldData(data);
  } catch {
    setFieldData(null);
  } finally {
    setIsLoadingFields(false);
  }
}, []);

const handleSave = async () => {
  if (!editorRef.current || !selectedPage) return;
  const payload = editorRef.current.getSavePayload();
  setIsSaving(true);
  try {
    const result = await savePageFieldOrder(payload);
    if (result.success) {
      toast.success("Field order saved successfully");
      const data = await fetchPageFieldData(selectedPage.Page_ID, selectedPage.Table_Name);
      setFieldData(data);
      setIsDirty(false);
    } else {
      toast.error(result.error ?? "Failed to save field order");
    }
  } catch {
    toast.error("An unexpected error occurred while saving");
  } finally {
    setIsSaving(false);
  }
};
```

Mounting the editor:

```typescript
// src/app/(web)/tools/fieldmanagement/field-management.tsx:173-179
<FieldOrderEditor
  ref={editorRef}
  fields={fieldData.fields}
  tableMetadata={fieldData.tableMetadata}
  onDirtyChange={setIsDirty}
/>
```

## Gotchas
- **Synthetic `Page_Field_ID < 0`** — any ID below zero was invented by `fetchPageFieldData` and is only a React key. Do **not** send it to MP. The save payload schema (`FieldOrderPayload`) intentionally omits `Page_Field_ID`; the stored proc matches by `@PageID + @FieldName`.
- **Group numbers renumber on every save** — the user-visible "1 - …", "2 - …" prefixes are stripped and reassigned by `buildSavePayload` from current display order (`use-field-order-state.ts:188-193`). The `GROUP_PREFIX_REGEX` is `/^\d+\s*-\s*/` (`use-field-order-state.ts:10`); renaming a group to e.g. `"Contact Details"` without a prefix works and will become `"1 - Contact Details"` on save.
- **`"99 - Other Fields"` is a string literal, not a number** — it's compared by exact string match. Do not change its casing or spacing anywhere (`field-order-editor.tsx:14`, `use-field-order-state.ts:9`).
- **Deleting a group only works when empty** — `removeGroup` silently no-ops if the group still holds fields (`use-field-order-state.ts:123-124`); the UI enforces this by only rendering the trash icon when `fieldIds.length === 0`.
- **Primary key columns are skipped during merge** — any `IsPrimaryKey` column from `tableMetadata` is excluded (`actions.ts:38`), so PK fields that already exist in `dp_Page_Fields` stay but new ones won't be synthesized.
- **Schema-required overrides UI `Required`** — switch is disabled when `schemaRequired` is true (`sortable-field-item.tsx:128`). Flipping the underlying DB `Required` column for such a field is impossible from this UI; only `tableMetadata` can clear it.
- **`fetchPages` is fired once per mount** — `PageSearch` uses `fetchedRef` to block re-fetches; remounting the component (e.g., after a tool refresh) is the only way to refresh the page list.
- **`savePageFieldOrder` batches 5 procs at a time** — the service loops `fields` in chunks of `CONCURRENCY = 5` and awaits each batch (`src/services/fieldManagementService.ts:74,91-107`). A partial failure in batch N will short-circuit later batches, leaving `dp_Page_Fields` in a mixed state.
- **`session.user.id` check, not `userGuid`** — `getSession()` rejects on missing `user.id`, which is Better Auth's internal ID. The stored procs don't actually need the MP User_GUID, so this is intentional, but stays inconsistent with the rule in `CLAUDE.md` about preferring `userGuid` for MP lookups.

## Related docs
- [`../services/field-management-service.md`](../services/field-management-service.md) — `FieldManagementService` singleton, `executeProcedureWithBody` calls, batching
- [`../mp-schema/required-procs.md`](../mp-schema/required-procs.md) — `api_MPNextTools_GetPages`, `api_MPNextTools_GetPageFields`, `api_MPNextTools_UpdatePageFieldOrder` parameters
- [`tool-framework.md`](tool-framework.md) — `ToolContainer` host used by `src/app/(web)/tools/fieldmanagement/field-management.tsx`

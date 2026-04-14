# Selection Debug Component — Design Spec

**Date:** 2026-04-14
**Scope:** Template tool only (development/debug aid)

## Problem

When a tool is launched from Ministry Platform with a selection (`?s=123&pageID=292`), there's no visual indicator showing what selection was loaded. The address-labels tool resolves selection record IDs internally but doesn't surface this as a reusable debug component. The template tool — the reference implementation for all tools — should show selection details during development.

## Design

### Approach

Create a standalone `SelectionDebug` component in `src/components/tool/` following the existing debug box pattern (ToolParamsDebug, UserToolsDebug). The component calls a server action to resolve the selection's record IDs and displays them in a blue dashed-border box.

### New Files

1. **`src/components/tool/selection-debug-actions.ts`** — Server action
2. **`src/components/tool/selection-debug.tsx`** — Client component

### Modified Files

1. **`src/components/tool/index.ts`** — Add barrel export for `SelectionDebug`
2. **`src/app/(web)/tools/template/template-tool.tsx`** — Add `<SelectionDebug>` between `ToolParamsDebug` and `UserToolsDebug`

### Server Action: `getSelectionRecordIds`

File: `src/components/tool/selection-debug-actions.ts`

```typescript
"use server";

// Input: selectionId (number), pageId (number)
// Flow:
//   1. Get session via auth.api.getSession()
//   2. Look up MP User_ID from session.user.userGuid (query dp_Users)
//   3. Call ToolService.getSelectionRecordIds(selectionId, userId, pageId)
// Output: { recordIds: number[], count: number } or throws error
```

This follows the same auth → User_ID → stored proc pattern used in address-labels `actions.ts` lines 28-48 and 115-119.

### Component: `SelectionDebug`

File: `src/components/tool/selection-debug.tsx`

**Props:** `{ params: ToolParams }`

**Guard:** Returns `null` if `params.s` is `undefined` or `<= 0`.

**States:**
- **Loading:** Blue dashed box, spinner icon, "Loading selection..."
- **Error:** Red dashed box, error message
- **Success:** Blue dashed box with:
  - `ListChecks` icon + "Development Mode - Selection Details"
  - Grid of info cards: Selection ID, Page (Display_Name), Table (Table_Name), Record Count
  - First 5 Record IDs displayed as compact items, with "+N more" if count > 5
  - Collapsible "View Raw JSON" with full record ID array
  - "Remove this component before deploying to production" italic footer

**Visual pattern:** Matches `ToolParamsDebug` exactly:
- `bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6`
- White card items with `border-blue-200`
- Divider with `border-blue-200`
- Text colors: `text-blue-900` (headers), `text-blue-700` (subtitles), `text-blue-600` (footer)

### Template Tool Integration

In `template-tool.tsx`, add between the existing debug components:

```tsx
<ToolParamsDebug params={params} />
<SelectionDebug params={params} />   {/* NEW */}
<UserToolsDebug />
```

### Data Flow

```
template-tool.tsx (client)
  └─ <SelectionDebug params={params} />
       └─ useEffect → getSelectionRecordIds(s, pageID)  [server action]
            ├─ auth.api.getSession()
            ├─ MPHelper.getTableRecords('dp_Users', ...) → User_ID
            └─ ToolService.getSelectionRecordIds(s, userId, pageID)
                 └─ executeProcedureWithBody('api_CloudTools_GetSelection')
       └─ setState({ recordIds, count })
       └─ Render blue box with details
```

## Out of Scope

- No changes to ToolContainer, address-labels, or any other existing tool
- No production-facing UI — this is a debug component only
- No record description/name resolution — just IDs

# Selection Debug Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blue dashed-border debug box to the template tool that resolves and displays Ministry Platform selection record IDs when the `s` query parameter is present.

**Architecture:** A server action (`resolveSelection`) authenticates and calls `ToolService.getSelectionRecordIds()` to resolve the selection. A client component (`SelectionDebug`) calls the action on mount and renders results in a blue dashed debug box matching the existing `UserToolsDebug` pattern.

**Tech Stack:** Next.js 16 server actions, React 19, Vitest, TypeScript strict mode, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-14-selection-debug-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/tool/selection-debug-actions.ts` | Create | Server action: auth + resolve selection record IDs |
| `src/components/tool/selection-debug-actions.test.ts` | Create | Tests for the server action |
| `src/components/tool/selection-debug.tsx` | Create | Client component: blue debug box with selection details |
| `src/components/tool/index.ts` | Modify | Add `SelectionDebug` barrel export |
| `src/app/(web)/tools/template/template-tool.tsx` | Modify | Add `<SelectionDebug>` between params debug and user tools debug |

---

### Task 1: Server Action — `resolveSelection`

**Files:**
- Create: `src/components/tool/selection-debug-actions.ts`
- Test: `src/components/tool/selection-debug-actions.test.ts`

- [ ] **Step 1: Write the test file with mocks and test cases**

Create `src/components/tool/selection-debug-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockMPGetTableRecords = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getSelectionRecordIds: mockGetSelectionRecordIds,
    }),
  },
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockMPGetTableRecords;
  },
}));

import { resolveSelection } from './selection-debug-actions';

const validSession = {
  user: { id: 'ba-1', userGuid: 'guid-abc' },
  session: { id: 'sess-1' },
};

describe('resolveSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(validSession);
    mockMPGetTableRecords.mockResolvedValue([{ User_ID: 42 }]);
  });

  it('should resolve selection record IDs', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([100, 200, 300]);

    const result = await resolveSelection(5, 292);

    expect(result).toEqual({ recordIds: [100, 200, 300], count: 3 });
    expect(mockGetSelectionRecordIds).toHaveBeenCalledWith(5, 42, 292);
  });

  it('should return empty array when selection has no records', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([]);

    const result = await resolveSelection(5, 292);

    expect(result).toEqual({ recordIds: [], count: 0 });
  });

  it('should throw when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(resolveSelection(5, 292)).rejects.toThrow('Unauthorized');
  });

  it('should throw when userGuid is missing from session', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'ba-1' } });

    await expect(resolveSelection(5, 292)).rejects.toThrow('User GUID not found in session');
  });

  it('should throw when MP user not found', async () => {
    mockMPGetTableRecords.mockResolvedValue([]);

    await expect(resolveSelection(5, 292)).rejects.toThrow('MP user not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tool/selection-debug-actions.test.ts`
Expected: FAIL — module `./selection-debug-actions` not found.

- [ ] **Step 3: Write the server action**

Create `src/components/tool/selection-debug-actions.ts`:

```typescript
'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ToolService } from '@/services/toolService';
import { MPHelper } from '@/lib/providers/ministry-platform';

export interface SelectionResult {
  recordIds: number[];
  count: number;
}

export async function resolveSelection(
  selectionId: number,
  pageId: number
): Promise<SelectionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userGuid = (session.user as Record<string, unknown>).userGuid as string | undefined;
  if (!userGuid) throw new Error('User GUID not found in session');

  const mp = new MPHelper();
  const records = await mp.getTableRecords<{ User_ID: number }>({
    table: 'dp_Users',
    filter: `User_GUID = '${userGuid}'`,
    select: 'User_ID',
    top: 1,
  });

  if (!records || records.length === 0) throw new Error('MP user not found');
  const userId = records[0].User_ID;

  const toolService = await ToolService.getInstance();
  const recordIds = await toolService.getSelectionRecordIds(selectionId, userId, pageId);

  return { recordIds, count: recordIds.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tool/selection-debug-actions.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tool/selection-debug-actions.ts src/components/tool/selection-debug-actions.test.ts
git commit -m "feat(tool): add resolveSelection server action for selection debug"
```

---

### Task 2: Client Component — `SelectionDebug`

**Files:**
- Create: `src/components/tool/selection-debug.tsx`

- [ ] **Step 1: Create the SelectionDebug component**

Create `src/components/tool/selection-debug.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ListChecks, Loader2, Info } from "lucide-react";
import { resolveSelection } from "./selection-debug-actions";
import type { ToolParams } from "@/lib/tool-params";
import type { SelectionResult } from "./selection-debug-actions";

interface SelectionDebugProps {
  params: ToolParams;
}

export function SelectionDebug({ params }: SelectionDebugProps) {
  const [result, setResult] = useState<SelectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasSelection = params.s !== undefined && params.s > 0 && params.pageID !== undefined;

  useEffect(() => {
    if (!hasSelection) return;

    async function fetchSelection() {
      try {
        const data = await resolveSelection(params.s!, params.pageID!);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve selection");
      } finally {
        setLoading(false);
      }
    }

    fetchSelection();
  }, [hasSelection, params.s, params.pageID]);

  if (!hasSelection) return null;

  const pageName = params.pageData?.Display_Name ?? (params.pageID ? `Page ${params.pageID}` : "N/A");
  const tableName = params.pageData?.Table_Name ?? "N/A";

  if (loading) {
    return (
      <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm mb-1">
              Development Mode - Loading Selection...
            </h3>
            <p className="text-xs text-blue-700">
              Resolving record IDs for Selection {params.s}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 text-sm mb-1">
              Development Mode - Selection Error
            </h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const displayIds = result.recordIds.slice(0, 5);
  const remaining = result.count - displayIds.length;

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <ListChecks className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 text-sm mb-1">
            Development Mode - Selection Details
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Selection ID</div>
          <div className="text-sm font-medium text-blue-900">{params.s}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Page</div>
          <div className="text-sm font-medium text-blue-900">{pageName}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Table</div>
          <div className="text-sm font-medium text-blue-900">{tableName}</div>
        </div>
        <div className="bg-white rounded border border-blue-200 px-3 py-2">
          <div className="text-xs font-mono text-gray-500 mb-1">Record Count</div>
          <div className="text-sm font-medium text-blue-900">{result.count}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-mono text-gray-500 mb-1">Record IDs</div>
        <div className="flex flex-wrap gap-1.5">
          {displayIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center bg-white border border-blue-200 rounded px-2 py-0.5 text-xs font-mono text-blue-900"
            >
              {id}
            </span>
          ))}
          {remaining > 0 && (
            <span className="inline-flex items-center text-xs text-blue-700">
              +{remaining} more
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-blue-200">
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-700 font-medium hover:text-blue-900">
            View Raw JSON
          </summary>
          <pre className="mt-2 bg-white p-3 rounded border border-blue-200 overflow-x-auto text-xs">
            {JSON.stringify(result.recordIds, null, 2)}
          </pre>
        </details>
      </div>

      <p className="text-xs text-blue-600 mt-3 italic">
        💡 Remove this component before deploying to production
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run type check to verify no errors**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tool/selection-debug.tsx
git commit -m "feat(tool): add SelectionDebug client component"
```

---

### Task 3: Barrel Export + Template Tool Integration

**Files:**
- Modify: `src/components/tool/index.ts`
- Modify: `src/app/(web)/tools/template/template-tool.tsx`

- [ ] **Step 1: Add SelectionDebug to barrel export**

In `src/components/tool/index.ts`, add line:
```typescript
export { SelectionDebug } from './selection-debug';
```

- [ ] **Step 2: Add SelectionDebug to template tool**

In `src/app/(web)/tools/template/template-tool.tsx`:

1. Update import on line 5 to include `SelectionDebug`:
```typescript
import { ToolContainer, ToolParamsDebug, SelectionDebug } from "@/components/tool";
```

2. Add `<SelectionDebug params={params} />` between `ToolParamsDebug` and `UserToolsDebug` (after line 66):
```tsx
<ToolParamsDebug params={params} />

{/* Selection Debug - Remove before production */}
<SelectionDebug params={params} />

{/* User Tools Debug - Remove before production */}
<UserToolsDebug />
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Run all existing tests to confirm no regressions**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/tool/index.ts src/app/(web)/tools/template/template-tool.tsx
git commit -m "feat(tool): integrate SelectionDebug into template tool"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test with selection params**

Open: `http://localhost:3000/tools/template?s=1&pageID=292&sc=5`
Expected: Blue dashed box appears showing selection details (or error box if not authenticated / no matching selection).

- [ ] **Step 3: Test without selection params**

Open: `http://localhost:3000/tools/template?recordID=123&pageID=292`
Expected: No blue selection box visible. Only purple params debug and user tools debug show.

- [ ] **Step 4: Test with s=0**

Open: `http://localhost:3000/tools/template?s=0&pageID=292`
Expected: No blue selection box (guard prevents rendering for s <= 0).

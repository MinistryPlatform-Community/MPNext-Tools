import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { PageField } from './types';

const OTHER = '99 - Other Fields';
const FLAT = '__flat__';

// `move()` from @dnd-kit/helpers relies on internal dnd-kit manager/shape objects
// that cannot be constructed as plain synthetic events in jsdom. We mock it with a
// controllable implementation so we can drive the hook's own branching logic
// (which group array gets mutated, in what order) without reimplementing dnd-kit's
// collision/mutation algorithm.
const mockMove = vi.hoisted(() => vi.fn());
vi.mock('@dnd-kit/helpers', () => ({
  move: mockMove,
}));

// `isSortable()` checks `instanceof SortableDroppable/SortableDraggable`, which are
// real dnd-kit classes we cannot instantiate from a synthetic event. We mock it to
// key off a plain marker property on our synthetic source objects instead.
const mockIsSortable = vi.hoisted(() => vi.fn());
vi.mock('@dnd-kit/react/sortable', () => ({
  isSortable: mockIsSortable,
}));

import { useFieldOrderState } from './use-field-order-state';

// The hook's handleDragOver/handleDragEnd parameter types are derived from real
// @dnd-kit event types (Draggable/Droppable/DragOperationSnapshot), which carry
// many internal fields we cannot construct in a synthetic test event. These
// casts let us pass minimal `{ operation: { source, target } }` shapes that
// exercise the hook's own branching without reimplementing dnd-kit's internals.
 
function fakeDragEvent(event: unknown): any {
  return event;
}

function makeField(overrides: Partial<PageField> & { Page_Field_ID: number; Field_Name: string }): PageField {
  return {
    Page_Field_ID: overrides.Page_Field_ID,
    Page_ID: 1,
    Field_Name: overrides.Field_Name,
    Group_Name: 'Group_Name' in overrides ? overrides.Group_Name! : '1 - General',
    View_Order: overrides.View_Order ?? 1,
    Required: overrides.Required ?? false,
    Hidden: overrides.Hidden ?? false,
    Default_Value: null,
    Filter_Clause: null,
    Depends_On_Field: null,
    Field_Label: null,
    Writing_Assistant_Enabled: false,
    isSeparator: overrides.isSeparator ?? false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFieldOrderState > hideAllSeparators', () => {
  it('flips Hidden to true and moves separators to "99 - Other Fields"', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'First_Name', Group_Name: '1 - General', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'Sep_A', Group_Name: '1 - General', View_Order: 2, isSeparator: true }),
      makeField({ Page_Field_ID: 3, Field_Name: 'Last_Name', Group_Name: '2 - Name', View_Order: 3 }),
      makeField({ Page_Field_ID: 4, Field_Name: 'Sep_B', Group_Name: '2 - Name', View_Order: 4, isSeparator: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });

    expect(result.current.fieldLookup.get(2)?.Hidden).toBe(true);
    expect(result.current.fieldLookup.get(4)?.Hidden).toBe(true);
    expect(result.current.fieldLookup.get(1)?.Hidden).toBe(false);
    expect(result.current.fieldLookup.get(3)?.Hidden).toBe(false);

    expect(result.current.groupedFields['1 - General']).toEqual([1]);
    expect(result.current.groupedFields['2 - Name']).toEqual([3]);
    expect(result.current.groupedFields[OTHER]).toEqual([2, 4]);
    expect(result.current.groupOrder[result.current.groupOrder.length - 1]).toBe(OTHER);
    expect(result.current.isDirty).toBe(true);
  });

  it('preserves existing "Other" fields ahead of newly-moved separators', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 10, Field_Name: 'Existing_Other', Group_Name: OTHER, View_Order: 1 }),
      makeField({ Page_Field_ID: 11, Field_Name: 'Sep_X', Group_Name: '1 - General', View_Order: 2, isSeparator: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });

    expect(result.current.groupedFields[OTHER]).toEqual([10, 11]);
  });

  it('no-ops when no separators exist', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'First_Name', Group_Name: '1 - General', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.fieldLookup.get(1)?.Hidden).toBe(false);
  });

  it('handles auto-injected separators with negative Page_Field_IDs', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'First_Name', Group_Name: '1 - General', View_Order: 1 }),
      makeField({ Page_Field_ID: -1, Field_Name: 'Sep_Injected', Group_Name: null, View_Order: 2, isSeparator: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });

    expect(result.current.fieldLookup.get(-1)?.Hidden).toBe(true);
    expect(result.current.groupedFields[OTHER]).toContain(-1);
  });

  it('flips Hidden values so buildSavePayload persists Hidden=true for separators', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'First_Name', Group_Name: '1 - General', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'Sep_A', Group_Name: '1 - General', View_Order: 2, isSeparator: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });

    const payload = result.current.buildSavePayload();
    const sep = payload.find((p) => p.Field_Name === 'Sep_A');
    expect(sep?.Hidden).toBe(true);
    expect(sep?.Group_Name).toBe(OTHER);
  });
});

describe('useFieldOrderState > initialization', () => {
  it('groups flat fields (no Group_Name) under the internal flat bucket, sorted by View_Order', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 2, Field_Name: 'Second', Group_Name: null, View_Order: 2 }),
      makeField({ Page_Field_ID: 1, Field_Name: 'First', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    expect(result.current.isFlat).toBe(true);
    expect(result.current.groupOrder).toEqual([FLAT]);
    expect(result.current.groupedFields[FLAT]).toEqual([1, 2]);
  });

  it('groups fields by Group_Name, sorting groups numerically with "Other" pinned last', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '10 - Later', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '2 - Earlier', View_Order: 1 }),
      makeField({ Page_Field_ID: 3, Field_Name: 'C', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    expect(result.current.isFlat).toBe(false);
    expect(result.current.groupOrder).toEqual(['2 - Earlier', '10 - Later', OTHER]);
    expect(result.current.groupedFields[OTHER]).toEqual([3]);
  });
});

describe('useFieldOrderState > handleDragOver', () => {
  const fields: PageField[] = [
    makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - General', View_Order: 1 }),
    makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '1 - General', View_Order: 2 }),
  ];

  it('skips calling move() when the drag source is a group', () => {
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.groupedFields;

    act(() => {
      result.current.handleDragOver(fakeDragEvent({ operation: { source: { type: 'group' } } }));
    });

    expect(mockMove).not.toHaveBeenCalled();
    expect(result.current.groupedFields).toBe(before);
  });

  it('delegates to move() and applies its result when the source is a field', () => {
    const { result } = renderHook(() => useFieldOrderState(fields));
    const moved = { '1 - General': [2, 1] };
    mockMove.mockReturnValue(moved);

    const event = { operation: { source: { type: 'field', id: 1 }, target: { id: 2 } } };
    act(() => {
      result.current.handleDragOver(fakeDragEvent(event));
    });

    expect(mockMove).toHaveBeenCalledWith({ '1 - General': [1, 2] }, event);
    expect(result.current.groupedFields).toEqual(moved);
  });
});

describe('useFieldOrderState > handleDragEnd', () => {
  const fields: PageField[] = [
    makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - General', View_Order: 1 }),
    makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '2 - Second', View_Order: 1 }),
  ];

  it('restores the pre-drag snapshot when the drag is canceled', () => {
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.handleDragStart();
    });
    // Mutate state after the snapshot was taken, simulating an in-flight drag.
    mockMove.mockReturnValue({ '1 - General': [], '2 - Second': [1, 2] });
    act(() => {
      result.current.handleDragOver(fakeDragEvent({ operation: { source: { type: 'field', id: 1 }, target: { id: 2 } } }));
    });
    expect(result.current.groupedFields).toEqual({ '1 - General': [], '2 - Second': [1, 2] });

    act(() => {
      result.current.handleDragEnd(fakeDragEvent({ canceled: true, operation: { source: { type: 'field' } } }));
    });

    expect(result.current.groupedFields).toEqual({ '1 - General': [1], '2 - Second': [2] });
    expect(result.current.groupOrder).toEqual(['1 - General', '2 - Second']);
    expect(result.current.isDirty).toBe(false);
  });

  it('reorders groupOrder and re-pins "Other Fields" last when a group handle is dropped', () => {
    const groupedFields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '2 - Second', View_Order: 1 }),
      makeField({ Page_Field_ID: 3, Field_Name: 'C', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(groupedFields));
    expect(result.current.groupOrder).toEqual(['1 - First', '2 - Second', OTHER]);

    mockIsSortable.mockReturnValue(true);
    mockMove.mockReturnValue([OTHER, '1 - First', '2 - Second']);

    act(() => {
      result.current.handleDragEnd(fakeDragEvent({
        canceled: false,
        operation: { source: { type: 'group', id: OTHER }, target: { id: '1 - First' } },
      }));
    });

    // "Other Fields" must be pulled back to the end even though move() put it first.
    expect(result.current.groupOrder).toEqual(['1 - First', '2 - Second', OTHER]);
    expect(result.current.isDirty).toBe(true);
  });

  it('leaves groupOrder untouched when isSortable() is false, even if source.type is "group"', () => {
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.groupOrder;
    mockIsSortable.mockReturnValue(false);

    act(() => {
      result.current.handleDragEnd(fakeDragEvent({
        canceled: false,
        operation: { source: { type: 'group' }, target: { id: '2 - Second' } },
      }));
    });

    expect(mockMove).not.toHaveBeenCalled();
    expect(result.current.groupOrder).toBe(before);
    expect(result.current.isDirty).toBe(true);
  });

  it('only marks dirty (no groupOrder change) when the source is a plain field, not a group', () => {
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.groupOrder;
    mockIsSortable.mockReturnValue(true);

    act(() => {
      result.current.handleDragEnd(fakeDragEvent({
        canceled: false,
        operation: { source: { type: 'field' }, target: { id: 2 } },
      }));
    });

    expect(mockMove).not.toHaveBeenCalled();
    expect(result.current.groupOrder).toBe(before);
    expect(result.current.isDirty).toBe(true);
  });

  it('does not re-splice when "Other Fields" is already last after the group move', () => {
    const groupedFields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(groupedFields));

    mockIsSortable.mockReturnValue(true);
    mockMove.mockReturnValue(['1 - First', OTHER]);

    act(() => {
      result.current.handleDragEnd(fakeDragEvent({
        canceled: false,
        operation: { source: { type: 'group' }, target: { id: '1 - First' } },
      }));
    });

    expect(result.current.groupOrder).toEqual(['1 - First', OTHER]);
  });
});

describe('useFieldOrderState > addGroup', () => {
  it('transitions flat fields into a new group, moving all flat fields into "Other Fields"', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: null, View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: null, View_Order: 2 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));
    expect(result.current.isFlat).toBe(true);

    act(() => {
      result.current.addGroup('1 - New Group');
    });

    expect(result.current.isFlat).toBe(false);
    expect(result.current.groupedFields).toEqual({
      '1 - New Group': [],
      [OTHER]: [1, 2],
    });
    expect(result.current.groupOrder).toEqual(['1 - New Group', OTHER]);
    expect(result.current.isDirty).toBe(true);
  });

  it('inserts a new group before "Other Fields" when already grouped', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.addGroup('2 - New');
    });

    expect(result.current.groupOrder).toEqual(['1 - First', '2 - New', OTHER]);
    expect(result.current.groupedFields['2 - New']).toEqual([]);
  });

  it('appends the new group at the end when there is no "Other Fields" group yet', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.addGroup('2 - New');
    });

    expect(result.current.groupOrder).toEqual(['1 - First', '2 - New']);
  });
});

describe('useFieldOrderState > removeGroup', () => {
  it('removes an empty group from both groupedFields and groupOrder', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.addGroup('2 - Empty');
    });
    expect(result.current.groupedFields['2 - Empty']).toEqual([]);

    act(() => {
      result.current.removeGroup('2 - Empty');
    });

    expect(result.current.groupedFields['2 - Empty']).toBeUndefined();
    expect(result.current.groupOrder).not.toContain('2 - Empty');
    expect(result.current.isDirty).toBe(true);
  });

  it('is a no-op on groupedFields when the group still has fields, but still removes it from groupOrder', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.removeGroup('1 - First');
    });

    // Documented actual behavior: groupedFields keeps the non-empty group (guard
    // in removeGroup refuses to drop its fields), but groupOrder unconditionally
    // filters the name out regardless of that guard — see filed TODO
    // 2026-09-13-removegroup-order-guard-mismatch.md.
    expect(result.current.groupedFields['1 - First']).toEqual([1]);
    expect(result.current.groupOrder).not.toContain('1 - First');

    // Consequence: buildSavePayload iterates groupOrder, so field 1 is silently
    // dropped from the save payload even though it still exists in groupedFields.
    const payload = result.current.buildSavePayload();
    expect(payload.find((p) => p.Field_Name === 'A')).toBeUndefined();
  });

  it('is a no-op when the group name does not exist in groupedFields at all', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.groupedFields;

    act(() => {
      result.current.removeGroup('Never Existed');
    });

    expect(result.current.groupedFields).toEqual(before);
    expect(result.current.isDirty).toBe(true);
  });
});

describe('useFieldOrderState > moveHiddenToOther', () => {
  it('moves hidden fields from every group into "Other Fields", appending after existing Other fields', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1, Hidden: false }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '1 - First', View_Order: 2, Hidden: true }),
      makeField({ Page_Field_ID: 3, Field_Name: 'C', Group_Name: OTHER, View_Order: 3, Hidden: false }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.moveHiddenToOther();
    });

    expect(result.current.groupedFields['1 - First']).toEqual([1]);
    expect(result.current.groupedFields[OTHER]).toEqual([3, 2]);
    expect(result.current.groupOrder).toContain(OTHER);
    expect(result.current.isDirty).toBe(true);
  });

  it('is a no-op when nothing is hidden', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1, Hidden: false }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.groupedFields;

    act(() => {
      result.current.moveHiddenToOther();
    });

    expect(result.current.groupedFields).toBe(before);
    expect(result.current.isDirty).toBe(true);
  });

  it('adds "Other Fields" to groupOrder if it was not already present', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: null, View_Order: 1, Hidden: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));
    // Flat mode: groupOrder is [FLAT] and does not include OTHER yet.
    expect(result.current.groupOrder).not.toContain(OTHER);

    act(() => {
      result.current.moveHiddenToOther();
    });

    expect(result.current.groupOrder).toContain(OTHER);
  });
});

describe('useFieldOrderState > updateField', () => {
  it('merges updates into the existing field and marks dirty', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1, Required: false }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.updateField(1, { Required: true });
    });

    expect(result.current.fieldLookup.get(1)?.Required).toBe(true);
    expect(result.current.fieldLookup.get(1)?.Field_Name).toBe('A');
    expect(result.current.isDirty).toBe(true);
  });

  it('no-ops when the field id is unknown, but still marks dirty', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));
    const before = result.current.fieldLookup;

    act(() => {
      result.current.updateField(999, { Required: true });
    });

    expect(result.current.fieldLookup).toBe(before);
    expect(result.current.isDirty).toBe(true);
  });
});

describe('useFieldOrderState > buildSavePayload', () => {
  it('resolves group names to null for flat mode', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: null, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    const payload = result.current.buildSavePayload();
    expect(payload).toEqual([
      expect.objectContaining({ Field_Name: 'A', Group_Name: null, View_Order: 1 }),
    ]);
  });

  it('renumbers named groups sequentially and keeps "Other Fields" as-is, skipping unknown field ids', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '5 - First', View_Order: 1 }),
      makeField({ Page_Field_ID: 2, Field_Name: 'B', Group_Name: '10 - Second', View_Order: 1 }),
      makeField({ Page_Field_ID: 3, Field_Name: 'C', Group_Name: OTHER, View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    const payload = result.current.buildSavePayload();
    const byName = Object.fromEntries(payload.map((p) => [p.Field_Name, p]));

    expect(byName['A'].Group_Name).toBe('1 - First');
    expect(byName['B'].Group_Name).toBe('2 - Second');
    expect(byName['C'].Group_Name).toBe(OTHER);
    // View_Order increments continuously across groups regardless of renumbering.
    expect(payload.map((p) => p.View_Order)).toEqual([1, 2, 3]);
  });

  it('falls back to an empty field list for a group present in groupOrder but absent from groupedFields', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    // Drive groupOrder to include a name with no corresponding groupedFields entry
    // via the mocked move() used by the group-reorder path in handleDragEnd.
    mockIsSortable.mockReturnValue(true);
    mockMove.mockReturnValue(['1 - First', 'Ghost Group']);
    act(() => {
      result.current.handleDragEnd(fakeDragEvent({
        canceled: false,
        operation: { source: { type: 'group' }, target: { id: '1 - First' } },
      }));
    });
    expect(result.current.groupOrder).toContain('Ghost Group');
    expect(result.current.groupedFields['Ghost Group']).toBeUndefined();

    const payload = result.current.buildSavePayload();
    expect(payload).toHaveLength(1);
    expect(payload[0].Field_Name).toBe('A');
  });

  it('skips a field id present in a group array but missing from fieldLookup', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'A', Group_Name: '1 - First', View_Order: 1 }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    // Inject a dangling field id (999) into the group via the mocked move() used
    // by the field-reorder path in handleDragOver.
    mockMove.mockReturnValue({ '1 - First': [1, 999] });
    act(() => {
      result.current.handleDragOver(fakeDragEvent({ operation: { source: { type: 'field', id: 1 }, target: { id: 1 } } }));
    });
    expect(result.current.groupedFields['1 - First']).toEqual([1, 999]);

    const payload = result.current.buildSavePayload();
    expect(payload).toHaveLength(1);
    expect(payload[0].Field_Name).toBe('A');
  });
});

describe('useFieldOrderState > hideAllSeparators idempotency', () => {
  it('leaves an already-hidden separator untouched on a second call', () => {
    const fields: PageField[] = [
      makeField({ Page_Field_ID: 1, Field_Name: 'Sep_A', Group_Name: '1 - General', View_Order: 1, isSeparator: true }),
    ];
    const { result } = renderHook(() => useFieldOrderState(fields));

    act(() => {
      result.current.hideAllSeparators();
    });
    expect(result.current.fieldLookup.get(1)?.Hidden).toBe(true);

    act(() => {
      result.current.hideAllSeparators();
    });
    expect(result.current.fieldLookup.get(1)?.Hidden).toBe(true);
  });
});

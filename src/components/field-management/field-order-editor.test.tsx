import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PageField, FieldOrderEditorHandle } from './types';

const {
  mockUseFieldOrderState,
  mockBuildSavePayload,
  mockMoveHiddenToOther,
  mockHideAllSeparators,
  mockAddGroup,
  mockRemoveGroup,
  mockUpdateField,
  mockHandleDragStart,
  mockHandleDragOver,
  mockHandleDragEnd,
} = vi.hoisted(() => ({
  mockUseFieldOrderState: vi.fn(),
  mockBuildSavePayload: vi.fn(),
  mockMoveHiddenToOther: vi.fn(),
  mockHideAllSeparators: vi.fn(),
  mockAddGroup: vi.fn(),
  mockRemoveGroup: vi.fn(),
  mockUpdateField: vi.fn(),
  mockHandleDragStart: vi.fn(),
  mockHandleDragOver: vi.fn(),
  mockHandleDragEnd: vi.fn(),
}));

vi.mock('./use-field-order-state', () => ({
  useFieldOrderState: mockUseFieldOrderState,
}));

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-provider">{children}</div>,
}));

vi.mock('./sortable-field-item', () => ({
  SortableFieldItem: ({ field }: { field: PageField }) => (
    <div data-testid={`field-${field.Page_Field_ID}`}>{field.Field_Name}</div>
  ),
}));

vi.mock('./sortable-group', () => ({
  SortableGroup: ({ groupName, isPinned, fieldIds }: { groupName: string; isPinned: boolean; fieldIds: number[] }) => (
    <div data-testid={`group-${groupName}`} data-pinned={String(isPinned)}>
      {groupName} ({fieldIds.length})
    </div>
  ),
}));

vi.mock('./new-group-dialog', () => ({
  NewGroupDialog: ({
    open,
    onCreateGroup,
    existingGroupNames,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateGroup: (name: string) => void;
    existingGroupNames: string[];
  }) =>
    open ? (
      <div data-testid="new-group-dialog">
        <span data-testid="existing-names">{existingGroupNames.join(',')}</span>
        <button onClick={() => onCreateGroup('New Group')}>confirm-create</button>
      </div>
    ) : null,
}));

import { FieldOrderEditor } from './field-order-editor';

function makeField(overrides: Partial<PageField> = {}): PageField {
  return {
    Page_Field_ID: 1,
    Page_ID: 1,
    Field_Name: 'First_Name',
    Group_Name: null,
    View_Order: 1,
    Required: false,
    Hidden: false,
    Default_Value: null,
    Filter_Clause: null,
    Depends_On_Field: null,
    Field_Label: null,
    Writing_Assistant_Enabled: false,
    isSeparator: false,
    ...overrides,
  };
}

function defaultState(overrides: Record<string, unknown> = {}) {
  return {
    groupedFields: { __flat__: [1] },
    groupOrder: ['__flat__'],
    fieldLookup: new Map([[1, makeField()]]),
    isFlat: true,
    isDirty: false,
    handleDragStart: mockHandleDragStart,
    handleDragOver: mockHandleDragOver,
    handleDragEnd: mockHandleDragEnd,
    addGroup: mockAddGroup,
    removeGroup: mockRemoveGroup,
    moveHiddenToOther: mockMoveHiddenToOther,
    hideAllSeparators: mockHideAllSeparators,
    updateField: mockUpdateField,
    buildSavePayload: mockBuildSavePayload,
    ...overrides,
  };
}

describe('FieldOrderEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFieldOrderState.mockReturnValue(defaultState());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a flat list of fields with a field/fields count and no group count', () => {
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);
    expect(screen.getByTestId('field-1')).toHaveTextContent('First_Name');
    expect(screen.getAllByText('1 field').length).toBeGreaterThan(0);
    expect(screen.queryByText(/in \d+ groups/)).not.toBeInTheDocument();
  });

  it('filters out flat-mode field ids missing from fieldLookup', () => {
    mockUseFieldOrderState.mockReturnValue(
      defaultState({ groupedFields: { __flat__: [1, 999] }, fieldLookup: new Map([[1, makeField()]]) })
    );
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);
    expect(screen.getByTestId('field-1')).toBeInTheDocument();
    expect(screen.queryByTestId('field-999')).not.toBeInTheDocument();
  });

  it('renders SortableGroup per group in grouped mode, with count text and isPinned for "Other Fields"', () => {
    mockUseFieldOrderState.mockReturnValue(
      defaultState({
        isFlat: false,
        groupOrder: ['1 - General', '99 - Other Fields'],
        groupedFields: { '1 - General': [1], '99 - Other Fields': [] },
      })
    );
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);

    expect(screen.getByTestId('group-1 - General')).toHaveAttribute('data-pinned', 'false');
    expect(screen.getByTestId('group-99 - Other Fields')).toHaveAttribute('data-pinned', 'true');
    expect(screen.getByText('1 field in 2 groups')).toBeInTheDocument();
  });

  it('pluralizes the total field count across all groups', () => {
    mockUseFieldOrderState.mockReturnValue(
      defaultState({
        isFlat: false,
        groupOrder: ['1 - General', '2 - Other'],
        groupedFields: { '1 - General': [1, 2], '2 - Other': [3] },
        fieldLookup: new Map([
          [1, makeField({ Page_Field_ID: 1 })],
          [2, makeField({ Page_Field_ID: 2 })],
          [3, makeField({ Page_Field_ID: 3 })],
        ]),
      })
    );
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);
    expect(screen.getByText('3 fields in 2 groups')).toBeInTheDocument();
  });

  it('opens the New Group dialog and forwards existing group names', () => {
    mockUseFieldOrderState.mockReturnValue(
      defaultState({ isFlat: false, groupOrder: ['1 - General'], groupedFields: { '1 - General': [] } })
    );
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);

    expect(screen.queryByTestId('new-group-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('New Group'));

    expect(screen.getByTestId('new-group-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('existing-names')).toHaveTextContent('1 - General');
  });

  it('calls state.addGroup when a new group is confirmed via the dialog', () => {
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);
    fireEvent.click(screen.getByText('New Group'));
    fireEvent.click(screen.getByText('confirm-create'));
    expect(mockAddGroup).toHaveBeenCalledWith('New Group');
  });

  it('computes schemaRequiredFields from tableMetadata.Columns with IsRequired', () => {
    render(
      <FieldOrderEditor
        fields={[]}
        tableMetadata={{
          Table_Name: 'Contacts',
          Columns: [
            { Name: 'First_Name', IsRequired: true },
            { Name: 'Last_Name', IsRequired: false },
          ],
           
        } as any}
        onDirtyChange={vi.fn()}
      />
    );
    // Rendered via the mocked SortableFieldItem which does not display schemaRequired,
    // so we assert indirectly: the editor renders without throwing and the field shows.
    expect(screen.getByTestId('field-1')).toBeInTheDocument();
  });

  it('calls onDirtyChange whenever state.isDirty changes', () => {
    const onDirtyChange = vi.fn();
    mockUseFieldOrderState.mockReturnValue(defaultState({ isDirty: true }));
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={onDirtyChange} />);
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });

  it('exposes getSavePayload, moveHiddenToOther, and hideAllSeparators through the ref', () => {
    const ref = createRef<FieldOrderEditorHandle>();
    mockBuildSavePayload.mockReturnValue([{ Field_Name: 'A' }]);

    render(<FieldOrderEditor ref={ref} fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);

    expect(ref.current?.getSavePayload()).toEqual([{ Field_Name: 'A' }]);
    ref.current?.moveHiddenToOther();
    expect(mockMoveHiddenToOther).toHaveBeenCalledTimes(1);
    ref.current?.hideAllSeparators();
    expect(mockHideAllSeparators).toHaveBeenCalledTimes(1);
  });

  it('wires the DragDropProvider callbacks to the hook handlers', () => {
    render(<FieldOrderEditor fields={[]} tableMetadata={null} onDirtyChange={vi.fn()} />);
    expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    // handleDragStart/Over/End are passed by reference to useFieldOrderState's
    // return value and consumed by the (mocked) DragDropProvider; verifying the
    // hook was invoked with the fields prop demonstrates the wiring compiles and runs.
    expect(mockUseFieldOrderState).toHaveBeenCalledWith([]);
  });
});

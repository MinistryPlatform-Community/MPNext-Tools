import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PageField } from './types';

const { mockUseSortable } = vi.hoisted(() => ({
  mockUseSortable: vi.fn(),
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: mockUseSortable,
}));

vi.mock('@dnd-kit/abstract', () => ({
  CollisionPriority: { Low: 'low', Normal: 'normal', High: 'high' },
}));

import { SortableGroup } from './sortable-group';

function makeField(overrides: Partial<PageField> = {}): PageField {
  return {
    Page_Field_ID: 1,
    Page_ID: 1,
    Field_Name: 'First_Name',
    Group_Name: '1 - General',
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

describe('SortableGroup', () => {
  beforeEach(() => {
    mockUseSortable.mockReturnValue({ ref: vi.fn(), isDragging: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls useSortable with id/index/type/accept/collisionPriority/disabled derived from props', () => {
    render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );

    expect(mockUseSortable).toHaveBeenCalledWith({
      id: '1 - General',
      index: 0,
      type: 'group',
      accept: ['item', 'group'],
      collisionPriority: 'low',
      disabled: false,
    });
  });

  it('disables the sortable and hides the grip handle when isPinned', () => {
    render(
      <SortableGroup
        groupName="99 - Other Fields"
        index={1}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );

    expect(mockUseSortable).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
    expect(document.querySelector('.lucide-grip-vertical')).not.toBeInTheDocument();
  });

  it('renders the group name and singular/plural field count', () => {
    const { rerender } = render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1]}
        fieldLookup={new Map([[1, makeField()]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(screen.getByText('1 - General')).toBeInTheDocument();
    expect(screen.getByText('1 field')).toBeInTheDocument();

    rerender(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1, 2]}
        fieldLookup={new Map([[1, makeField({ Page_Field_ID: 1 })], [2, makeField({ Page_Field_ID: 2 })]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(screen.getByText('2 fields')).toBeInTheDocument();
  });

  it('applies the dragging ring class when isDragging is true', () => {
    mockUseSortable.mockReturnValue({ ref: vi.fn(), isDragging: true });
    const { container } = render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(container.firstChild).toHaveClass('opacity-40', 'ring-2', 'ring-cyan-400');
  });

  it('applies the pinned styling when isPinned and not dragging', () => {
    const { container } = render(
      <SortableGroup
        groupName="99 - Other Fields"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(container.firstChild).toHaveClass('border-gray-300', 'bg-gray-50');
  });

  it('shows the remove (trash) button only for an empty, non-pinned group, and it calls onRemove', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <SortableGroup
        groupName="2 - Empty"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned={false}
        onRemove={onRemove}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );

    const trashButton = container.querySelector('.lucide-trash')?.closest('button');
    expect(trashButton).not.toBeNull();
    fireEvent.click(trashButton!);
    expect(onRemove).toHaveBeenCalledWith('2 - Empty');
  });

  it('does not show the remove button for a non-empty group', () => {
    const { container } = render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1]}
        fieldLookup={new Map([[1, makeField()]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(container.querySelector('.lucide-trash')).not.toBeInTheDocument();
  });

  it('does not show the remove button for an empty pinned group', () => {
    const { container } = render(
      <SortableGroup
        groupName="99 - Other Fields"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(container.querySelector('.lucide-trash')).not.toBeInTheDocument();
  });

  it('shows the "Drag fields here" placeholder for an empty group', () => {
    render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[]}
        fieldLookup={new Map()}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(screen.getByText('Drag fields here')).toBeInTheDocument();
  });

  it('renders a SortableFieldItem per field id, skipping ids missing from fieldLookup', () => {
    render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1, 999]}
        fieldLookup={new Map([[1, makeField({ Page_Field_ID: 1, Field_Name: 'First_Name' })]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(screen.getByText('First_Name')).toBeInTheDocument();
    expect(screen.queryByText('Drag fields here')).not.toBeInTheDocument();
  });

  it('passes schemaRequired through to a field based on schemaRequiredFields', () => {
    render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1]}
        fieldLookup={new Map([[1, makeField({ Page_Field_ID: 1, Field_Name: 'First_Name', Required: false })]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set(['First_Name'])}
      />
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('toggles collapsed state via the chevron button, hiding the fields area', () => {
    const { container } = render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1]}
        fieldLookup={new Map([[1, makeField()]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    expect(screen.getByText('First_Name')).toBeInTheDocument();

    const chevronButton = container.querySelector('.lucide-chevron-down')!.closest('button')!;
    fireEvent.click(chevronButton);
    expect(screen.queryByText('First_Name')).not.toBeInTheDocument();

    const collapsedChevronButton = container.querySelector('.lucide-chevron-right')!.closest('button')!;
    fireEvent.click(collapsedChevronButton);
    expect(screen.getByText('First_Name')).toBeInTheDocument();
  });

  it('toggles collapsed state via the group name click', () => {
    render(
      <SortableGroup
        groupName="1 - General"
        index={0}
        fieldIds={[1]}
        fieldLookup={new Map([[1, makeField()]])}
        isPinned={false}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        schemaRequiredFields={new Set()}
      />
    );
    fireEvent.click(screen.getByText('1 - General'));
    expect(screen.queryByText('First_Name')).not.toBeInTheDocument();
  });
});

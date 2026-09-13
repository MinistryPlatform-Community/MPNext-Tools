import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PageField } from './types';

const { mockUseSortable } = vi.hoisted(() => ({
  mockUseSortable: vi.fn(),
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: mockUseSortable,
}));

import { SortableFieldItem } from './sortable-field-item';

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

describe('SortableFieldItem', () => {
  beforeEach(() => {
    mockUseSortable.mockReturnValue({ ref: vi.fn(), isDragging: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls useSortable with id/index/group/type derived from props', () => {
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={2} groupName="1 - General" onUpdateField={vi.fn()} schemaRequired={false} />
    );

    expect(mockUseSortable).toHaveBeenCalledWith({
      id: 1,
      index: 2,
      type: 'item',
      accept: 'item',
      group: '1 - General',
    });
  });

  it('renders the field name and label', () => {
    const field = makeField({ Field_Label: 'First Name' });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.getByText('First_Name')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
  });

  it('shows an em-dash when Field_Label is null', () => {
    const field = makeField({ Field_Label: null });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('applies the dragging opacity/ring class when isDragging is true', () => {
    mockUseSortable.mockReturnValue({ ref: vi.fn(), isDragging: true });
    const field = makeField();
    const { container } = render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(container.firstChild).toHaveClass('opacity-40', 'ring-2', 'ring-cyan-400');
  });

  it('renders separator styling and a Separator badge for a separator field', () => {
    const field = makeField({ isSeparator: true, Field_Name: 'Sep_A' });
    const { container } = render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(container.firstChild).toHaveClass('bg-slate-50', 'border-dashed');
    expect(screen.getByText('Separator')).toBeInTheDocument();
  });

  it('shows a Required badge when schemaRequired is true, even if field.Required is false', () => {
    const field = makeField({ Required: false });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired />
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows a Required badge when field.Required is true', () => {
    const field = makeField({ Required: true });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('does not show a Required badge for a separator even if Required is true', () => {
    const field = makeField({ isSeparator: true, Required: true });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('shows a Hidden badge when field.Hidden is true', () => {
    const field = makeField({ Hidden: true });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('toggles the expanded detail panel via the chevron button', () => {
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    expect(screen.queryByLabelText('Field Label')).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(screen.getByLabelText('Field Label')).toBeInTheDocument();

    fireEvent.click(buttons[0]);
    expect(screen.queryByLabelText('Field Label')).not.toBeInTheDocument();
  });

  it('toggles expansion when the field name text is clicked', () => {
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));
    expect(screen.getByLabelText('Field Label')).toBeInTheDocument();
  });

  it('renders the reduced separator detail panel (label + hidden switch, no required/default/filter/depends)', () => {
    const field = makeField({ isSeparator: true, Field_Name: 'Sep_A' });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('Sep_A'));

    expect(screen.getByLabelText('Field Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Hidden')).toBeInTheDocument();
    expect(screen.queryByLabelText('Default Value')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filter Clause')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Depends On Field')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Required')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Writing Assistant')).not.toBeInTheDocument();
  });

  it('renders the full detail panel for a non-separator field', () => {
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    expect(screen.getByLabelText('Field Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Value')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter Clause')).toBeInTheDocument();
    expect(screen.getByLabelText('Depends On Field')).toBeInTheDocument();
    expect(screen.getByLabelText('Required')).toBeInTheDocument();
    expect(screen.getByLabelText('Hidden')).toBeInTheDocument();
    expect(screen.getByLabelText('Writing Assistant')).toBeInTheDocument();
  });

  it('shows the "(schema)" hint and disables the switch when schemaRequired is true', () => {
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired />
    );
    fireEvent.click(screen.getByText('First_Name'));

    expect(screen.getByText('(schema)')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Required/)).toBeDisabled();
  });

  it('calls onUpdateField with a non-empty Field_Label as-is', () => {
    const onUpdateField = vi.fn();
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    fireEvent.change(screen.getByLabelText('Field Label'), { target: { value: 'New Label' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Field_Label: 'New Label' });
  });

  it('converts an emptied Field_Label to null', () => {
    // The inputs are controlled by the `field` prop, so re-emptying an
    // already-changed DOM value needs a fresh render seeded with a non-empty
    // value rather than a second fireEvent on the same uncontrolled node.
    const onUpdateField = vi.fn();
    const field = makeField({ Field_Label: 'Existing' });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    fireEvent.change(screen.getByLabelText('Field Label'), { target: { value: '' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Field_Label: null });
  });

  it('calls onUpdateField for Default_Value, Filter_Clause, and Depends_On_Field with non-empty text', () => {
    const onUpdateField = vi.fn();
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    fireEvent.change(screen.getByLabelText('Default Value'), { target: { value: 'x' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Default_Value: 'x' });

    fireEvent.change(screen.getByLabelText('Filter Clause'), { target: { value: 'y' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Filter_Clause: 'y' });

    fireEvent.change(screen.getByLabelText('Depends On Field'), { target: { value: 'z' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Depends_On_Field: 'z' });
  });

  it('converts emptied Default_Value, Filter_Clause, and Depends_On_Field to null', () => {
    const onUpdateField = vi.fn();
    const field = makeField({
      Default_Value: 'x',
      Filter_Clause: 'y',
      Depends_On_Field: 'z',
    });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    fireEvent.change(screen.getByLabelText('Default Value'), { target: { value: '' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Default_Value: null });

    fireEvent.change(screen.getByLabelText('Filter Clause'), { target: { value: '' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Filter_Clause: null });

    fireEvent.change(screen.getByLabelText('Depends On Field'), { target: { value: '' } });
    expect(onUpdateField).toHaveBeenCalledWith(1, { Depends_On_Field: null });
  });

  it('calls onUpdateField for Required, Hidden, and Writing_Assistant_Enabled switches', () => {
    const onUpdateField = vi.fn();
    const field = makeField();
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('First_Name'));

    fireEvent.click(screen.getByLabelText('Required'));
    expect(onUpdateField).toHaveBeenCalledWith(1, { Required: true });

    fireEvent.click(screen.getByLabelText('Hidden'));
    expect(onUpdateField).toHaveBeenCalledWith(1, { Hidden: true });

    fireEvent.click(screen.getByLabelText('Writing Assistant'));
    expect(onUpdateField).toHaveBeenCalledWith(1, { Writing_Assistant_Enabled: true });
  });

  it('calls onUpdateField for Hidden on a separator row', () => {
    const onUpdateField = vi.fn();
    const field = makeField({ isSeparator: true, Field_Name: 'Sep_A' });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('Sep_A'));

    fireEvent.click(screen.getByLabelText('Hidden'));
    expect(onUpdateField).toHaveBeenCalledWith(field.Page_Field_ID, { Hidden: true });
  });

  it('calls onUpdateField for Field_Label on a separator row, converting empty to null', () => {
    const onUpdateField = vi.fn();
    const field = makeField({ isSeparator: true, Field_Name: 'Sep_A', Field_Label: 'Existing' });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={onUpdateField} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('Sep_A'));

    const labelInput = screen.getByLabelText('Field Label');
    fireEvent.change(labelInput, { target: { value: '' } });
    expect(onUpdateField).toHaveBeenCalledWith(field.Page_Field_ID, { Field_Label: null });
  });

  it('uses the field name as the Field_Label input placeholder', () => {
    const field = makeField({ Field_Name: 'Last_Name', Field_Label: null });
    render(
      <SortableFieldItem field={field} index={0} groupName="g" onUpdateField={vi.fn()} schemaRequired={false} />
    );
    fireEvent.click(screen.getByText('Last_Name'));
    expect(screen.getByPlaceholderText('Last_Name')).toBeInTheDocument();
  });
});

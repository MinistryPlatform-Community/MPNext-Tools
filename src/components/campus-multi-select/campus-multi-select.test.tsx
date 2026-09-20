import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { SelectOption } from '@/lib/dto';
import { CampusMultiSelect } from './campus-multi-select';

type Props = React.ComponentProps<typeof CampusMultiSelect>;

const campuses: SelectOption[] = [
  { id: 1, label: 'Glendale' },
  { id: 2, label: 'Scottsdale' },
  { id: 3, label: 'Peoria' },
];

beforeEach(() => {
  // cmdk scrolls the active item into view; jsdom has no implementation.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderSelect(overrides: Partial<Props> = {}) {
  const props: Props = {
    campuses,
    selectedIds: [],
    onToggle: vi.fn(),
    ...overrides,
  };
  render(<CampusMultiSelect {...props} />);
  return props;
}

/** The closed field, which is the only element carrying aria-expanded. */
function field() {
  return screen.getByRole('button', { expanded: false });
}

describe('CampusMultiSelect', () => {
  it('shows the default placeholder when nothing is selected', () => {
    renderSelect();

    expect(screen.getByText('Any campus')).toBeInTheDocument();
    expect(field()).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('shows a custom placeholder', () => {
    renderSelect({ placeholder: 'Pick campuses' });
    expect(screen.getByText('Pick campuses')).toBeInTheDocument();
  });

  it('renders a removable badge for each selected campus instead of the placeholder', () => {
    renderSelect({ selectedIds: [1, 3] });

    expect(screen.queryByText('Any campus')).not.toBeInTheDocument();
    expect(screen.getByText('Glendale')).toBeInTheDocument();
    expect(screen.getByText('Peoria')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Glendale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Peoria' })).toBeInTheDocument();
  });

  it('ignores selected ids that are not in the campus list', () => {
    renderSelect({ selectedIds: [99] });
    expect(screen.getByText('Any campus')).toBeInTheDocument();
  });

  it('opens the list on click and offers every campus', () => {
    renderSelect();

    fireEvent.click(field());

    expect(screen.getByPlaceholderText('Search campuses…')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Glendale', 'Scottsdale', 'Peoria']);
  });

  it('selects a campus from the list', () => {
    const { onToggle } = renderSelect();

    fireEvent.click(field());
    fireEvent.click(screen.getByRole('option', { name: 'Scottsdale' }));

    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it('deselects a campus that is already chosen', () => {
    const { onToggle } = renderSelect({ selectedIds: [2] });

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('option', { name: 'Scottsdale' }));

    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it('clears a campus from its badge without opening the list', () => {
    const { onToggle } = renderSelect({ selectedIds: [1, 2] });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Scottsdale' }));

    expect(onToggle).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search campuses…')).not.toBeInTheDocument();
  });

  it('does not open the list when a badge is removed with the keyboard', () => {
    renderSelect({ selectedIds: [1] });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Remove Glendale' }), { key: 'Enter' });

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('opens with Enter and closes with Space', () => {
    renderSelect();

    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('button', { expanded: true }), { key: ' ' });
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('leaves the list closed for other keys', () => {
    renderSelect();

    fireEvent.keyDown(screen.getByRole('button', { expanded: false }), { key: 'a' });

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('filters the list and reports when nothing matches', () => {
    renderSelect();

    fireEvent.click(field());
    const search = screen.getByPlaceholderText('Search campuses…');

    fireEvent.change(search, { target: { value: 'Peo' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Peoria']);

    fireEvent.change(search, { target: { value: 'Tempe' } });
    expect(screen.getByText('No campuses found.')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('is not focusable when disabled', () => {
    renderSelect({ disabled: true, selectedIds: [1] });

    const trigger = screen.getByRole('button', { expanded: false });
    expect(trigger).toHaveAttribute('tabindex', '-1');
    expect(trigger).toHaveClass('cursor-not-allowed');
  });
});

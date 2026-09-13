import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

const { mockSearchGroups } = vi.hoisted(() => ({
  mockSearchGroups: vi.fn(),
}));

vi.mock('./actions', () => ({
  searchGroups: mockSearchGroups,
}));

import { GroupSearch } from './group-search';

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advanceDebounce(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('GroupSearch', () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView; cmdk calls it on selection change.
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mockSearchGroups.mockReset();
    mockSearchGroups.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the default placeholder when closed with no value', () => {
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText('Search groups...')).toBeInTheDocument();
  });

  it('shows a custom placeholder when provided', () => {
    render(
      <GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} placeholder="Search promotion target group..." />,
    );
    expect(screen.getByText('Search promotion target group...')).toBeInTheDocument();
  });

  it('shows the display name instead of the placeholder when value + displayName are set', () => {
    render(<GroupSearch value={5} displayName="Youth Group" onSelect={vi.fn()} />);
    expect(screen.getByText('Youth Group')).toBeInTheDocument();
    expect(screen.queryByText('Search groups...')).not.toBeInTheDocument();
  });

  it('disables the trigger button when disabled prop is true', () => {
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows the "type at least 2 characters" hint when opened with an empty query', () => {
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('doSearch short-circuits with empty results when the debounced term is still under 2 chars', async () => {
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    await advanceDebounce(300);
    expect(mockSearchGroups).not.toHaveBeenCalled();
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('debounces a >=2-char query, shows "Searching...", then renders results', async () => {
    let resolveSearch: (v: unknown) => void;
    mockSearchGroups.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a group name...');
    fireEvent.change(input, { target: { value: 'Yo' } });

    await advanceDebounce(300);
    expect(mockSearchGroups).toHaveBeenCalledWith('Yo');
    expect(screen.getByText('Searching...')).toBeInTheDocument();

    await act(async () => {
      resolveSearch!([{ Group_ID: 1, Group_Name: 'Youth Group', Group_Type: 'Small Group' }]);
      await Promise.resolve();
    });

    expect(screen.getByText('Youth Group')).toBeInTheDocument();
    expect(screen.getByText('Small Group')).toBeInTheDocument();
  });

  it('shows "No groups found." when a >=2-char search resolves empty', async () => {
    mockSearchGroups.mockResolvedValueOnce([]);
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a group name...');
    fireEvent.change(input, { target: { value: 'Zz' } });
    await advanceDebounce(300);

    expect(screen.getByText('No groups found.')).toBeInTheDocument();
  });

  it('recovers to empty results (no crash) when the search action rejects', async () => {
    mockSearchGroups.mockRejectedValueOnce(new Error('network down'));
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a group name...');
    fireEvent.change(input, { target: { value: 'Er' } });
    await advanceDebounce(300);

    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    expect(screen.getByText('No groups found.')).toBeInTheDocument();
  });

  it('renders a result without a Group_Type with no subtitle line', async () => {
    mockSearchGroups.mockResolvedValueOnce([{ Group_ID: 2, Group_Name: 'No Type Group', Group_Type: null }]);
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a group name...');
    fireEvent.change(input, { target: { value: 'No' } });
    await advanceDebounce(300);

    expect(screen.getByText('No Type Group')).toBeInTheDocument();
  });

  it('calls onSelect with id/name and closes the popover when a result is chosen', async () => {
    const onSelect = vi.fn();
    mockSearchGroups.mockResolvedValueOnce([{ Group_ID: 3, Group_Name: 'Pick Me', Group_Type: 'Type A' }]);
    render(<GroupSearch value={null} displayName={undefined} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a group name...');
    fireEvent.change(input, { target: { value: 'Pi' } });
    await advanceDebounce(300);

    fireEvent.click(screen.getByText('Pick Me'));
    await flush();

    expect(onSelect).toHaveBeenCalledWith(3, 'Pick Me');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows "Clear selection" only when value is set, and clears on click', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<GroupSearch value={null} displayName={undefined} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();

    cleanup();
    render(<GroupSearch value={9} displayName="Existing" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Clear selection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear selection'));
    await flush();
    expect(onSelect).toHaveBeenCalledWith(null, '');
    // silence unused rerender warning
    void rerender;
  });

  it('debounces rapid re-typing into a single call for the final term', async () => {
    render(<GroupSearch value={null} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type a group name...');

    fireEvent.change(input, { target: { value: 'Yo' } });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    fireEvent.change(input, { target: { value: 'You' } });
    await advanceDebounce(300);

    expect(mockSearchGroups).toHaveBeenCalledTimes(1);
    expect(mockSearchGroups).toHaveBeenCalledWith('You');
  });
});

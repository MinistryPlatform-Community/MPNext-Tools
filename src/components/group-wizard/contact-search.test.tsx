import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

const { mockSearchContacts } = vi.hoisted(() => ({
  mockSearchContacts: vi.fn(),
}));

vi.mock('./actions', () => ({
  searchContacts: mockSearchContacts,
}));

import { ContactSearch } from './contact-search';

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

describe('ContactSearch', () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView; cmdk calls it on selection change.
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mockSearchContacts.mockReset();
    mockSearchContacts.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the fixed placeholder when closed with no value', () => {
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText('Search contacts...')).toBeInTheDocument();
  });

  it('shows the display name instead of the placeholder when value + displayName are set', () => {
    render(<ContactSearch value={7} displayName="Jane Doe" onSelect={vi.fn()} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Search contacts...')).not.toBeInTheDocument();
  });

  it('disables the trigger button when disabled prop is true', () => {
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows the "type at least 2 characters" hint when opened with an empty query', () => {
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('doSearch short-circuits with empty results when the debounced term is still under 2 chars', async () => {
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    await advanceDebounce(300);
    expect(mockSearchContacts).not.toHaveBeenCalled();
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('debounces a >=2-char query, shows "Searching...", then renders results', async () => {
    let resolveSearch: (v: unknown) => void;
    mockSearchContacts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a name...');
    fireEvent.change(input, { target: { value: 'Ja' } });

    await advanceDebounce(300);
    expect(mockSearchContacts).toHaveBeenCalledWith('Ja');
    expect(screen.getByText('Searching...')).toBeInTheDocument();

    await act(async () => {
      resolveSearch!([{ Contact_ID: 1, Display_Name: 'Jane Doe', Email_Address: 'jane@example.com' }]);
      await Promise.resolve();
    });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows "No contacts found." when a >=2-char search resolves empty', async () => {
    mockSearchContacts.mockResolvedValueOnce([]);
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a name...');
    fireEvent.change(input, { target: { value: 'Zz' } });
    await advanceDebounce(300);

    expect(screen.getByText('No contacts found.')).toBeInTheDocument();
  });

  it('recovers to empty results (no crash) when the search action rejects', async () => {
    mockSearchContacts.mockRejectedValueOnce(new Error('network down'));
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a name...');
    fireEvent.change(input, { target: { value: 'Er' } });
    await advanceDebounce(300);

    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    expect(screen.getByText('No contacts found.')).toBeInTheDocument();
  });

  it('renders a result without an Email_Address with no subtitle line', async () => {
    mockSearchContacts.mockResolvedValueOnce([{ Contact_ID: 2, Display_Name: 'No Email Guy', Email_Address: null }]);
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a name...');
    fireEvent.change(input, { target: { value: 'No' } });
    await advanceDebounce(300);

    expect(screen.getByText('No Email Guy')).toBeInTheDocument();
  });

  it('calls onSelect with id/name and closes the popover when a result is chosen', async () => {
    const onSelect = vi.fn();
    mockSearchContacts.mockResolvedValueOnce([
      { Contact_ID: 3, Display_Name: 'Pick Me', Email_Address: 'pick@example.com' },
    ]);
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText('Type a name...');
    fireEvent.change(input, { target: { value: 'Pi' } });
    await advanceDebounce(300);

    fireEvent.click(screen.getByText('Pick Me'));
    await flush();

    expect(onSelect).toHaveBeenCalledWith(3, 'Pick Me');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('debounces rapid re-typing into a single call for the final term', async () => {
    render(<ContactSearch value={undefined} displayName={undefined} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type a name...');

    fireEvent.change(input, { target: { value: 'Ja' } });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    fireEvent.change(input, { target: { value: 'Jan' } });
    await advanceDebounce(300);

    expect(mockSearchContacts).toHaveBeenCalledTimes(1);
    expect(mockSearchContacts).toHaveBeenCalledWith('Jan');
  });
});

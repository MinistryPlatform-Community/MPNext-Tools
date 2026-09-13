import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';

const { mockFetchPages } = vi.hoisted(() => ({
  mockFetchPages: vi.fn(),
}));

vi.mock('./actions', () => ({
  fetchPages: mockFetchPages,
}));

import { PageSearch } from './page-search';
import type { PageListItem } from './types';

const contactsPage: PageListItem = { Page_ID: 292, Display_Name: 'Contacts', Table_Name: 'Contacts' };
const donationsPage: PageListItem = { Page_ID: 293, Display_Name: 'Donations', Table_Name: 'Contributions' };

describe('PageSearch', () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView; cmdk calls it on selection change.
    Element.prototype.scrollIntoView = vi.fn();
    mockFetchPages.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows "Loading pages..." and a disabled trigger while pages are being fetched', async () => {
    let resolveFetch: (pages: PageListItem[]) => void = () => {};
    mockFetchPages.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(<PageSearch value={undefined} onSelect={vi.fn()} />);

    expect(screen.getByText('Loading pages...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();

    await act(async () => {
      resolveFetch([contactsPage]);
    });

    expect(screen.queryByText('Loading pages...')).not.toBeInTheDocument();
  });

  it('shows "Select a page..." placeholder once loaded with no value', async () => {
    mockFetchPages.mockResolvedValueOnce([]);
    render(<PageSearch value={undefined} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Select a page...')).toBeInTheDocument());
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('shows the selected page Display_Name when value is set', async () => {
    mockFetchPages.mockResolvedValueOnce([contactsPage]);
    render(<PageSearch value={contactsPage} onSelect={vi.fn()} />);

    await waitFor(() => expect(mockFetchPages).toHaveBeenCalled());
    expect(screen.getByText('Contacts')).toBeInTheDocument();
  });

  it('falls back to an empty page list when fetchPages rejects', async () => {
    mockFetchPages.mockRejectedValueOnce(new Error('down'));
    render(<PageSearch value={undefined} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Select a page...')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No pages found.')).toBeInTheDocument();
  });

  it('only fetches pages once even if effects were to re-run (fetchedRef guard)', async () => {
    mockFetchPages.mockResolvedValueOnce([contactsPage]);
    const { rerender } = render(<PageSearch value={undefined} onSelect={vi.fn()} />);
    await waitFor(() => expect(mockFetchPages).toHaveBeenCalledTimes(1));

    rerender(<PageSearch value={contactsPage} onSelect={vi.fn()} />);

    expect(mockFetchPages).toHaveBeenCalledTimes(1);
  });

  it('lists fetched pages with Display_Name and Table_Name, and calls onSelect + closes on click', async () => {
    const onSelect = vi.fn();
    mockFetchPages.mockResolvedValueOnce([contactsPage, donationsPage]);
    render(<PageSearch value={undefined} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText('Select a page...')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Donations')).toBeInTheDocument();
    expect(screen.getByText('Contributions')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Donations'));

    expect(onSelect).toHaveBeenCalledWith(donationsPage);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a check mark next to the currently-selected page', async () => {
    mockFetchPages.mockResolvedValueOnce([contactsPage, donationsPage]);
    render(<PageSearch value={contactsPage} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));

    const items = screen.getAllByRole('option');
    const contactsItem = items.find((item) => item.textContent?.includes('Contacts'));
    const donationsItem = items.find((item) => item.textContent?.includes('Donations'));

    expect(contactsItem?.querySelector('svg')).toHaveClass('opacity-100');
    expect(donationsItem?.querySelector('svg')).toHaveClass('opacity-0');
  });

  it('resets the search-list scroll position on search input change', async () => {
    vi.useFakeTimers();
    try {
      mockFetchPages.mockResolvedValueOnce([contactsPage, donationsPage]);
      render(<PageSearch value={undefined} onSelect={vi.fn()} />);

      await act(async () => {
        await Promise.resolve();
      });
      fireEvent.click(screen.getByRole('combobox'));

      const input = screen.getByPlaceholderText('Search pages...');
      const scrollToSpy = vi.fn();
      // cmdk's CommandList forwards the ref to a scrollable div.
      const list = input.closest('[cmdk-root]')?.querySelector('[cmdk-list-sizer]')?.parentElement;
      if (list) (list as HTMLDivElement).scrollTo = scrollToSpy;

      fireEvent.change(input, { target: { value: 'Don' } });
      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
    } finally {
      vi.useRealTimers();
    }
  });
});

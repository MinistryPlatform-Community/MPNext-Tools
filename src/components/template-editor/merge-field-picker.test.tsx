import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const { mockGetSelected, mockGetWrapper } = vi.hoisted(() => ({
  mockGetSelected: vi.fn(),
  mockGetWrapper: vi.fn(),
}));

vi.mock('@grapesjs/react', () => ({
  useEditor: () => ({
    getSelected: mockGetSelected,
    getWrapper: mockGetWrapper,
  }),
}));

import { MergeFieldPicker } from './merge-field-picker';

describe('MergeFieldPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSelected.mockReturnValue(null);
    mockGetWrapper.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function openPicker() {
    render(<MergeFieldPicker />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
  }

  it('renders every category and field once opened', async () => {
    await openPicker();

    expect(await screen.findByText('Merge Fields')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Household')).toBeInTheDocument();
    expect(screen.getByText('Church')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('{{First_Name}}')).toBeInTheDocument();
  });

  it('appends the token to the selected mj-text component content instead of inserting a new block', async () => {
    const set = vi.fn();
    const selected = {
      get: (key: string) => (key === 'type' ? 'mj-text' : key === 'content' ? '<p>Hi </p>' : undefined),
      set,
    };
    mockGetSelected.mockReturnValue(selected);

    await openPicker();
    fireEvent.click(await screen.findByText('First Name'));

    expect(set).toHaveBeenCalledWith('content', '<p>Hi </p>{{First_Name}}');
    expect(mockGetWrapper).not.toHaveBeenCalled();
  });

  it('treats an empty existing content as empty string, not the literal "undefined"', async () => {
    const set = vi.fn();
    const selected = {
      get: (key: string) => (key === 'type' ? 'mj-text' : key === 'content' ? undefined : undefined),
      set,
    };
    mockGetSelected.mockReturnValue(selected);

    await openPicker();
    fireEvent.click(await screen.findByText('First Name'));

    expect(set).toHaveBeenCalledWith('content', '{{First_Name}}');
  });

  it('inserts a new mj-section under the mj-body when nothing is selected', async () => {
    const append = vi.fn();
    const body = { append };
    const wrapper = {
      find: (selector: string) => (selector === 'mj-body' ? [body] : []),
    };
    mockGetSelected.mockReturnValue(null);
    mockGetWrapper.mockReturnValue(wrapper);

    await openPicker();
    fireEvent.click(await screen.findByText('Unsubscribe Link'));

    expect(append).toHaveBeenCalledWith({
      type: 'mj-section',
      components: [
        {
          type: 'mj-column',
          components: [
            {
              type: 'mj-text',
              content: '<p>{{Unsubscribe_URL}}</p>',
            },
          ],
        },
      ],
    });
  });

  it('falls back to appending directly on the wrapper when no mj-body is found', async () => {
    const append = vi.fn();
    const wrapper = {
      find: () => [],
      append,
    };
    mockGetSelected.mockReturnValue(null);
    mockGetWrapper.mockReturnValue(wrapper);

    await openPicker();
    fireEvent.click(await screen.findByText('First Name'));

    expect(append).toHaveBeenCalledTimes(1);
  });

  it('does nothing (no throw) when selected is not mj-text and no wrapper exists', async () => {
    mockGetSelected.mockReturnValue(null);
    mockGetWrapper.mockReturnValue(null);

    await openPicker();
    const field = await screen.findByText('First Name');
    expect(() => fireEvent.click(field)).not.toThrow();
  });

  it('closes the popover after inserting a field', async () => {
    await openPicker();
    expect(await screen.findByText('Merge Fields')).toBeInTheDocument();
    fireEvent.click(screen.getByText('First Name'));

    expect(screen.queryByText('Merge Fields')).not.toBeInTheDocument();
  });
});

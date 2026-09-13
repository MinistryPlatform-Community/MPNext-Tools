import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Tool framework tests — ToolContainer, ToolHeader, ToolFooter.
 *
 * These three compose every tool page, so their optional-prop branches
 * (params -> DevPanel, infoContent -> tooltip, hideFooter -> no footer)
 * decide what every tool renders. Each branch is pinned here.
 */

vi.mock('@/components/dev-panel', () => ({
  DevPanel: ({ params }: { params: { pageID?: number } }) => (
    <div data-testid="dev-panel">dev-panel:{params.pageID}</div>
  ),
}));

import { ToolContainer } from './tool-container';
import { ToolHeader } from './tool-header';
import { ToolFooter } from './tool-footer';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ToolFooter', () => {
  it('renders default Close and Save labels', () => {
    render(<ToolFooter />);

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('honours custom labels', () => {
    render(<ToolFooter closeLabel="Cancel" saveLabel="Submit" />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('invokes onClose and onSave', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<ToolFooter onClose={onClose} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows "Saving..." and disables both buttons while saving', () => {
    render(<ToolFooter isSaving />);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });

  it('does not fire onSave while saving', async () => {
    const onSave = vi.fn();
    render(<ToolFooter onSave={onSave} isSaving />);

    await userEvent.click(screen.getByRole('button', { name: 'Saving...' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('renders footerExtra when supplied, and omits the slot when not', () => {
    const { unmount } = render(<ToolFooter footerExtra={<span>extra-node</span>} />);
    expect(screen.getByText('extra-node')).toBeInTheDocument();
    unmount();

    render(<ToolFooter />);
    expect(screen.queryByText('extra-node')).not.toBeInTheDocument();
  });
});

describe('ToolHeader', () => {
  it('renders the title as a level-1 heading', () => {
    render(<ToolHeader title="My Tool" />);

    expect(screen.getByRole('heading', { level: 1, name: 'My Tool' })).toBeInTheDocument();
  });

  it('omits the info affordance when infoContent is absent', () => {
    render(<ToolHeader title="My Tool" />);

    expect(screen.queryByRole('button', { name: 'Information' })).not.toBeInTheDocument();
  });

  it('renders a labelled info trigger when infoContent is supplied', () => {
    render(<ToolHeader title="My Tool" infoContent={<p>help text</p>} />);

    expect(screen.getByRole('button', { name: 'Information' })).toBeInTheDocument();
  });
});

describe('ToolContainer', () => {
  const params = { pageID: 42 } as never;

  it('renders children, header and footer by default', () => {
    render(
      <ToolContainer title="Container Tool">
        <p>body-content</p>
      </ToolContainer>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Container Tool' })).toBeInTheDocument();
    expect(screen.getByText('body-content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('omits the footer when hideFooter is set', () => {
    render(
      <ToolContainer title="Container Tool" hideFooter>
        <p>body-content</p>
      </ToolContainer>,
    );

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('renders the DevPanel only when params are supplied', () => {
    const { unmount } = render(
      <ToolContainer title="Container Tool">
        <p>body</p>
      </ToolContainer>,
    );
    expect(screen.queryByTestId('dev-panel')).not.toBeInTheDocument();
    unmount();

    render(
      <ToolContainer title="Container Tool" params={params}>
        <p>body</p>
      </ToolContainer>,
    );
    expect(screen.getByTestId('dev-panel')).toHaveTextContent('dev-panel:42');
  });

  it('forwards footer props through to ToolFooter', async () => {
    const onSave = vi.fn();
    render(
      <ToolContainer
        title="Container Tool"
        onSave={onSave}
        saveLabel="Persist"
        footerExtra={<span>footer-extra</span>}
      >
        <p>body</p>
      </ToolContainer>,
    );

    expect(screen.getByText('footer-extra')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Persist' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

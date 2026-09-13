import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockBack, mockToolContainer } = vi.hoisted(() => ({
  mockBack: vi.fn(),
  mockToolContainer: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}));

vi.mock('@/components/tool', () => ({
  ToolContainer: (props: Record<string, unknown>) => {
    mockToolContainer(props);
    return (
      <div data-testid="tool-container">
        <div data-testid="info">{props.infoContent as React.ReactNode}</div>
        <button onClick={props.onSave as () => void}>save</button>
        <button onClick={props.onClose as () => void}>close</button>
        <span data-testid="saving">{String(props.isSaving)}</span>
        {props.children as React.ReactNode}
      </div>
    );
  },
}));

import { TemplateTool } from './template-tool';
import type { ToolParams } from '@/lib/tool-params';

// isNewRecord() treats -1 and undefined as "new"; any other id is an edit.
const baseParams = { recordID: -1 } as ToolParams;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TemplateTool', () => {
  it('renders inside a ToolContainer titled "Template Tool"', () => {
    render(<TemplateTool params={baseParams} />);

    expect(screen.getByTestId('tool-container')).toBeInTheDocument();
    expect(mockToolContainer).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Template Tool' }),
    );
  });

  it.each([{ recordID: -1 }, {}])(
    'describes creating a record for new-record params %j',
    (params) => {
      render(<TemplateTool params={params as ToolParams} />);

      expect(screen.getByTestId('info')).toHaveTextContent('Create a new record');
    },
  );

  it('treats recordID 0 as an edit, not a new record', () => {
    // Only -1 and undefined mean "new" — 0 falls through to edit mode.
    render(<TemplateTool params={{ recordID: 0 } as ToolParams} />);

    expect(screen.getByTestId('info')).toHaveTextContent('Edit an existing record');
  });

  it('describes editing a record when an existing recordID is supplied', () => {
    render(<TemplateTool params={{ recordID: 77 } as ToolParams} />);

    expect(screen.getByTestId('info')).toHaveTextContent('Edit an existing record');
  });

  it('omits the launch context line when there is no pageID', () => {
    render(<TemplateTool params={baseParams} />);

    expect(screen.getByTestId('info')).not.toHaveTextContent('Launched from Page ID');
  });

  it('shows the launch pageID when present', () => {
    render(<TemplateTool params={{ recordID: 5, pageID: 312 } as ToolParams} />);

    expect(screen.getByTestId('info')).toHaveTextContent('Launched from Page ID: 312');
  });

  it('appends the selection id only when s is defined', () => {
    const { unmount } = render(
      <TemplateTool params={{ recordID: 5, pageID: 312, s: 9 } as ToolParams} />,
    );
    expect(screen.getByTestId('info')).toHaveTextContent('Selection: 9');
    unmount();

    render(<TemplateTool params={{ recordID: 5, pageID: 312 } as ToolParams} />);
    expect(screen.getByTestId('info')).not.toHaveTextContent('Selection:');
  });

  it('shows a selection of 0 rather than treating it as absent', () => {
    // `s === 0` is falsy but meaningful; the source guards on `!== undefined`.
    render(<TemplateTool params={{ recordID: 5, pageID: 312, s: 0 } as ToolParams} />);

    expect(screen.getByTestId('info')).toHaveTextContent('Selection: 0');
  });

  it('navigates back when closed', async () => {
    render(<TemplateTool params={baseParams} />);

    await userEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('flips isSaving while the save is in flight and clears it afterwards', async () => {
    // fireEvent rather than userEvent here: userEvent's own async scheduling
    // deadlocks against fake timers in this jsdom setup.
    vi.useFakeTimers();
    render(<TemplateTool params={baseParams} />);

    expect(screen.getByTestId('saving')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(screen.getByTestId('saving')).toHaveTextContent('true');

    // No waitFor here: it schedules on the same fake timers and would hang.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByTestId('saving')).toHaveTextContent('false');
  });

  it('renders the tool body section', () => {
    render(<TemplateTool params={baseParams} />);

    expect(screen.getByRole('heading', { name: /tool section/i })).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ToolParams } from '@/lib/tool-params';

const { mockRouterBack } = vi.hoisted(() => ({
  mockRouterBack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}));

vi.mock('@/components/tool', () => ({
  ToolContainer: ({
    title,
    infoContent,
    onClose,
    hideFooter,
    children,
  }: {
    title: string;
    infoContent?: React.ReactNode;
    onClose?: () => void;
    hideFooter?: boolean;
    children?: React.ReactNode;
  }) => (
    <div data-testid="tool-container">
      <div data-testid="title">{title}</div>
      <div data-testid="hide-footer">{String(hideFooter)}</div>
      <div data-testid="info-content">{infoContent}</div>
      <button onClick={onClose}>Close</button>
      {children}
    </div>
  ),
}));

vi.mock('@/components/text-messaging', () => ({
  TextMessagingForm: ({ params }: { params: ToolParams }) => (
    <div data-testid="text-messaging-form">{JSON.stringify(params)}</div>
  ),
}));

import { TextMessaging } from './text-messaging';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TextMessaging', () => {
  it('renders the compose form inside the tool container under the tool title', () => {
    const params: ToolParams = { pageID: 292, s: 17 };
    render(<TextMessaging params={params} />);

    expect(screen.getByTestId('tool-container')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Text Messaging');
    expect(screen.getByTestId('hide-footer')).toHaveTextContent('true');
    expect(screen.getByTestId('text-messaging-form').textContent).toBe(JSON.stringify(params));
  });

  it('describes the tool in the info panel', () => {
    render(<TextMessaging params={{}} />);

    const info = screen.getByTestId('info-content');
    expect(info).toHaveTextContent(
      'Send a text (or an MMS with an image) to a selection of records, an audience, or publication subscribers.'
    );
    expect(info).toHaveTextContent('Messages are written to Ministry Platform communications for the platform to deliver.');
  });

  it('omits the launch line from the info panel when there is no page', () => {
    render(<TextMessaging params={{}} />);
    expect(screen.queryByText(/Launched from Page ID:/)).not.toBeInTheDocument();
  });

  it('names the launching page when there is no selection', () => {
    render(<TextMessaging params={{ pageID: 292 }} />);
    expect(screen.getByText('Launched from Page ID: 292')).toBeInTheDocument();
  });

  it('names the launching page and selection together', () => {
    render(<TextMessaging params={{ pageID: 292, s: 17 }} />);
    expect(screen.getByText('Launched from Page ID: 292 | Selection: 17')).toBeInTheDocument();
  });

  it('navigates back when the tool is closed', () => {
    render(<TextMessaging params={{ pageID: 292 }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});

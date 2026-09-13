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
    children,
  }: {
    title: string;
    infoContent?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid="tool-container">
      <div data-testid="title">{title}</div>
      <div data-testid="info-content">{infoContent}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/components/template-editor', () => ({
  TemplateEditorForm: ({ onClose }: { onClose: () => void }) => (
    <button data-testid="template-editor-form" onClick={onClose}>
      form
    </button>
  ),
}));

import { TemplateEditor } from './template-editor';

describe('TemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the ToolContainer with the Template Editor title and form', () => {
    const params: ToolParams = {};
    render(<TemplateEditor params={params} />);

    expect(screen.getByTestId('title')).toHaveTextContent('Template Editor');
    expect(screen.getByTestId('template-editor-form')).toBeInTheDocument();
  });

  it('navigates back via router.back() when the form requests close', () => {
    render(<TemplateEditor params={{}} />);

    fireEvent.click(screen.getByTestId('template-editor-form'));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('omits the pageID/recordID line from the info popover when pageID is absent', () => {
    render(<TemplateEditor params={{}} />);
    expect(screen.queryByText(/Page ID:/)).not.toBeInTheDocument();
  });

  it('shows pageID (without recordID) in the info popover when only pageID is set', () => {
    render(<TemplateEditor params={{ pageID: 292 }} />);
    expect(screen.getByText('Page ID: 292')).toBeInTheDocument();
  });

  it('shows pageID and recordID together in the info popover when both are set', () => {
    render(<TemplateEditor params={{ pageID: 292, recordID: 7 }} />);
    expect(screen.getByText('Page ID: 292 | Record: 7')).toBeInTheDocument();
  });

  it('shows the recordID line even when recordID is 0 (falsy but defined)', () => {
    render(<TemplateEditor params={{ pageID: 292, recordID: 0 }} />);
    expect(screen.getByText('Page ID: 292 | Record: 0')).toBeInTheDocument();
  });
});

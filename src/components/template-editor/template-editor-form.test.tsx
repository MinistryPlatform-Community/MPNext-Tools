import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * `next/dynamic` is mocked directly so both the resolved component and the
 * `loading` fallback (`EditorSkeleton`) are independently testable and
 * covered, without depending on the real dynamic-import/suspense timing.
 */
const { mockDynamic } = vi.hoisted(() => ({
  mockDynamic: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: mockDynamic,
}));

vi.mock('./editor-canvas', () => ({
  EditorCanvas: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="editor-canvas" onClick={onClose} />
  ),
}));

describe('TemplateEditorForm', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls next/dynamic with a loader resolving to EditorCanvas and ssr disabled', async () => {
    let capturedOptions: { ssr?: boolean; loading?: () => React.ReactNode } | undefined;
    mockDynamic.mockImplementation((loader, options) => {
      capturedOptions = options;
      return function DynamicResult() {
        return <div data-testid="dynamic-result" />;
      };
    });

    const { TemplateEditorForm } = await import('./template-editor-form');
    render(<TemplateEditorForm onClose={vi.fn()} />);

    expect(mockDynamic).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.ssr).toBe(false);

    const loaderFn = mockDynamic.mock.calls[0][0] as () => Promise<{ default: unknown }>;
    const mod = await loaderFn();
    const editorCanvasModule = await import('./editor-canvas');
    expect(mod.default).toBe(editorCanvasModule.EditorCanvas);
  });

  it('renders the loading fallback (EditorSkeleton) via the loading option', async () => {
    let capturedOptions: { loading?: () => React.ReactNode } | undefined;
    mockDynamic.mockImplementation((loader, options) => {
      capturedOptions = options;
      return function DynamicResult() {
        return <div data-testid="dynamic-result" />;
      };
    });

    await import('./template-editor-form');
    const loadingNode = capturedOptions?.loading?.();

    // EditorSkeleton renders Skeleton placeholders inside a flex row plus a
    // header skeleton — assert the structural shape rather than text, since
    // Skeleton has no visible copy.
    const { container } = render(<>{loadingNode}</>);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('renders the resolved dynamic component (EditorCanvas) with onClose wired through', async () => {
    const { EditorCanvas } = await import('./editor-canvas');
    mockDynamic.mockImplementation(() => EditorCanvas);

    const { TemplateEditorForm } = await import('./template-editor-form');
    const onClose = vi.fn();
    render(<TemplateEditorForm onClose={onClose} />);

    const canvas = await screen.findByTestId('editor-canvas');
    canvas.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

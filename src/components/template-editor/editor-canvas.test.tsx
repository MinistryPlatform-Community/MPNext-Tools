import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { Editor } from 'grapesjs';

// EditorToolbar has its own dedicated test file — stub it here so
// EditorCanvas tests focus on GjsEditor wiring (onReady setup, storage
// gating for the default template) rather than toolbar internals.
vi.mock('./editor-toolbar', () => ({
  EditorToolbar: ({ onClose }: { onClose: () => void }) => (
    <button data-testid="toolbar-close" onClick={onClose}>
      close
    </button>
  ),
}));

vi.mock('grapesjs', () => ({
  default: {},
}));

vi.mock('grapesjs-mjml', () => ({
  default: {},
}));

// jsdom/vitest route real .css imports through the project's PostCSS/Tailwind
// config, which isn't valid outside a Next.js build — stub both stylesheet
// imports so only the component logic is under test.
vi.mock('grapesjs/dist/css/grapes.min.css', () => ({}));
vi.mock('@/styles/grapesjs-overrides.css', () => ({}));

const { mockRegisterMergeFieldBlocks } = vi.hoisted(() => ({
  mockRegisterMergeFieldBlocks: vi.fn(),
}));

vi.mock('./merge-fields', () => ({
  registerMergeFieldBlocks: mockRegisterMergeFieldBlocks,
}));

const { _mockBlocksAdd, mockBlocksRemove, mockSetComponents, buildFakeEditor } = vi.hoisted(() => {
  const _mockBlocksAdd = vi.fn();
  const mockBlocksRemove = vi.fn();
  const mockSetComponents = vi.fn();
  const buildFakeEditor = () => ({
    Blocks: { add: _mockBlocksAdd, remove: mockBlocksRemove },
    setComponents: mockSetComponents,
  });
  return { _mockBlocksAdd, mockBlocksRemove, mockSetComponents, buildFakeEditor };
});

vi.mock('@grapesjs/react', () => ({
  __esModule: true,
  // Named `GjsEditorMock` rather than declared inline on `default:` so the
  // react-hooks lint rule recognises it as a component and allows useEffect.
  default: function GjsEditorMock({
    onReady,
    children,
    className,
  }: {
    onReady?: (editor: Editor) => void;
    children?: React.ReactNode;
    className?: string;
  }) {
    const React = require('react');
    React.useEffect(() => {
      onReady?.(buildFakeEditor() as unknown as Editor);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement('div', { className, 'data-testid': 'gjs-editor' }, children);
  },
  Canvas: ({ className }: { className?: string }) => (
    // Real GrapesJS mounts its canvas iframe under a `.gjs-cv-canvas` node
    // regardless of the className prop — replicate that class here so the
    // component's `document.querySelector('.gjs-cv-canvas')` sizing logic
    // has something to find, the same as it would in a real DOM.
    <div data-testid="canvas" className={`gjs-cv-canvas ${className ?? ''}`} />
  ),
  WithEditor: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { EditorCanvas } from './editor-canvas';
import { STORAGE_KEY, DEFAULT_MJML_TEMPLATE } from './grapes-config';

describe('EditorCanvas', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the canvas and the (stubbed) toolbar', () => {
    render(<EditorCanvas onClose={onClose} />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-close')).toBeInTheDocument();
  });

  it('registers merge field blocks and removes navbar blocks on ready', () => {
    render(<EditorCanvas onClose={onClose} />);

    expect(mockRegisterMergeFieldBlocks).toHaveBeenCalledTimes(1);
    expect(mockBlocksRemove).toHaveBeenCalledWith('mj-navbar');
    expect(mockBlocksRemove).toHaveBeenCalledWith('mj-navbar-link');
  });

  it('loads the default MJML template when no saved state exists in localStorage', () => {
    render(<EditorCanvas onClose={onClose} />);
    expect(mockSetComponents).toHaveBeenCalledWith(DEFAULT_MJML_TEMPLATE);
  });

  it('does not overwrite saved state when localStorage already has a draft', () => {
    localStorage.setItem(STORAGE_KEY, '{"some":"state"}');
    render(<EditorCanvas onClose={onClose} />);
    expect(mockSetComponents).not.toHaveBeenCalled();
  });

  it('tolerates localStorage being unavailable and still seeds the default template', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    render(<EditorCanvas onClose={onClose} />);
    expect(mockSetComponents).toHaveBeenCalledWith(DEFAULT_MJML_TEMPLATE);
  });

  it('invokes the onEditorReady callback prop with the editor instance', () => {
    const onEditorReady = vi.fn();
    render(<EditorCanvas onClose={onClose} onEditorReady={onEditorReady} />);
    expect(onEditorReady).toHaveBeenCalledTimes(1);
    expect(onEditorReady).toHaveBeenCalledWith(expect.objectContaining({ setComponents: mockSetComponents }));
  });

  it('passes onClose through to the toolbar', () => {
    render(<EditorCanvas onClose={onClose} />);
    screen.getByTestId('toolbar-close').click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

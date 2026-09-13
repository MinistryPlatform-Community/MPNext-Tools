import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

// Sub-dialogs / picker are exercised in their own test files — stub them here
// so EditorToolbar tests focus on the toolbar's own wiring (undo/redo state,
// device/panel toggles, and the Clear-canvas confirmation).
vi.mock('./editor-code-dialog', () => ({
  EditorCodeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="code-dialog" /> : null,
}));
vi.mock('./editor-import-dialog', () => ({
  EditorImportDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="import-dialog" /> : null,
}));
vi.mock('./editor-export-dialog', () => ({
  EditorExportDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="export-dialog" /> : null,
}));
vi.mock('./merge-field-picker', () => ({
  MergeFieldPicker: () => <div data-testid="merge-field-picker" />,
}));

const {
  mockHasUndo,
  mockHasRedo,
  mockUndo,
  mockRedo,
  mockOn,
  mockOff,
  mockSetDevice,
  mockDomComponentsClear,
  mockCssComposerClear,
  mockUndoManagerClear,
  mockCommandsHas,
  mockRunCommand,
  mockStopCommand,
  mockEditor,
} = vi.hoisted(() => {
  const mockHasUndo = vi.fn(() => false);
  const mockHasRedo = vi.fn(() => false);
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockOn = vi.fn();
  const mockOff = vi.fn();
  const mockSetDevice = vi.fn();
  const mockDomComponentsClear = vi.fn();
  const mockCssComposerClear = vi.fn();
  const mockUndoManagerClear = vi.fn();
  const mockCommandsHas = vi.fn(() => false);
  const mockRunCommand = vi.fn();
  const mockStopCommand = vi.fn();

  // Stable object identity — EditorToolbar's effects depend on `editor` by
  // reference, so recreating the object per useEditor() call would retrigger
  // effects every render and infinite-loop the test.
  const mockEditor = {
    UndoManager: {
      hasUndo: mockHasUndo,
      hasRedo: mockHasRedo,
      undo: mockUndo,
      redo: mockRedo,
      clear: mockUndoManagerClear,
    },
    on: mockOn,
    off: mockOff,
    setDevice: mockSetDevice,
    DomComponents: { clear: mockDomComponentsClear },
    CssComposer: { clear: mockCssComposerClear },
    Commands: { has: mockCommandsHas },
    runCommand: mockRunCommand,
    stopCommand: mockStopCommand,
  };

  return {
    mockHasUndo,
    mockHasRedo,
    mockUndo,
    mockRedo,
    mockOn,
    mockOff,
    mockSetDevice,
    mockDomComponentsClear,
    mockCssComposerClear,
    mockUndoManagerClear,
    mockCommandsHas,
    mockRunCommand,
    mockStopCommand,
    mockEditor,
  };
});

vi.mock('@grapesjs/react', () => ({
  useEditor: () => mockEditor,
}));

import { EditorToolbar } from './editor-toolbar';

/**
 * `ToolbarButton` renders icon-only buttons: the tooltip text is not wired as
 * an accessible name (Radix Tooltip only links `aria-describedby` while the
 * tooltip is actually open), so `getByRole('button', { name })` cannot find
 * them. Locate them instead by the lucide icon's stable CSS class
 * (`lucide-<kebab-case-icon-name>`), which each toolbar button renders
 * exactly one of.
 */
function getIconButton(iconClass: string): HTMLElement {
  const button = screen
    .getAllByRole('button')
    .find((b) => b.querySelector(`svg.lucide-${iconClass}`));
  if (!button) {
    throw new Error(`No button found containing an svg.lucide-${iconClass}`);
  }
  return button;
}

describe('EditorToolbar', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasUndo.mockReturnValue(false);
    mockHasRedo.mockReturnValue(false);
    mockCommandsHas.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('subscribes to change:changesCount on mount and unsubscribes on unmount', () => {
    const { unmount } = render(<EditorToolbar onClose={onClose} />);
    expect(mockOn).toHaveBeenCalledWith('change:changesCount', expect.any(Function));

    unmount();
    expect(mockOff).toHaveBeenCalledWith('change:changesCount', expect.any(Function));
  });

  it('disables Undo/Redo buttons when the UndoManager reports none available', () => {
    render(<EditorToolbar onClose={onClose} />);
    expect(getIconButton('undo-2')).toBeDisabled();
    expect(getIconButton('redo-2')).toBeDisabled();
  });

  it('enables and wires Undo/Redo when the UndoManager reports availability', () => {
    mockHasUndo.mockReturnValue(true);
    mockHasRedo.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);

    const undoBtn = getIconButton('undo-2');
    const redoBtn = getIconButton('redo-2');
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect(mockUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(redoBtn);
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('re-syncs undo/redo state when the subscribed change event fires', () => {
    render(<EditorToolbar onClose={onClose} />);
    expect(getIconButton('undo-2')).toBeDisabled();

    mockHasUndo.mockReturnValue(true);
    const onUpdate = mockOn.mock.calls.find(([event]) => event === 'change:changesCount')?.[1];
    act(() => {
      onUpdate?.();
    });

    expect(getIconButton('undo-2')).not.toBeDisabled();
  });

  it('switches active device and calls editor.setDevice', () => {
    render(<EditorToolbar onClose={onClose} />);

    fireEvent.click(getIconButton('smartphone'));
    expect(mockSetDevice).toHaveBeenCalledWith('Mobile');

    fireEvent.click(getIconButton('monitor'));
    expect(mockSetDevice).toHaveBeenCalledWith('Desktop');
  });

  it('resizes the views container and canvas elements when they exist in the DOM', () => {
    // Simulate the real GrapesJS-rendered nodes the toolbar's effect looks
    // up by class name via document.querySelector.
    const viewsContainer = document.createElement('div');
    viewsContainer.className = 'gjs-pn-views-container';
    const canvas = document.createElement('div');
    canvas.className = 'gjs-cv-canvas';
    document.body.append(viewsContainer, canvas);

    mockCommandsHas.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);
    expect(viewsContainer.style.display).toBe('block');
    expect(canvas.style.width).toBe('calc(100% - 240px)');

    // Toggling the active panel closed hides the sidebar again.
    fireEvent.click(getIconButton('layout-grid'));
    expect(viewsContainer.style.display).toBe('none');
    expect(canvas.style.width).toBe('100%');

    viewsContainer.remove();
    canvas.remove();
  });

  it('opens the Blocks panel command by default on mount when the command exists', () => {
    mockCommandsHas.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);
    expect(mockRunCommand).toHaveBeenCalledWith('core:open-blocks');
  });

  it('toggles a panel closed when its already-active button is clicked again', () => {
    mockCommandsHas.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);
    mockRunCommand.mockClear();
    mockStopCommand.mockClear();

    fireEvent.click(getIconButton('layout-grid'));

    // Active panel becomes null: all panel-close commands run, none (re)open.
    expect(mockStopCommand).toHaveBeenCalledWith('core:open-blocks');
    expect(mockStopCommand).toHaveBeenCalledWith('core:open-layers');
    expect(mockStopCommand).toHaveBeenCalledWith('core:open-styles-manager');
    expect(mockRunCommand).not.toHaveBeenCalled();
  });

  it('switches to the Layers panel when its button is clicked', () => {
    mockCommandsHas.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);
    mockRunCommand.mockClear();

    fireEvent.click(getIconButton('layers'));
    expect(mockRunCommand).toHaveBeenCalledWith('core:open-layers');
  });

  it('switches to the Styles panel when its button is clicked', () => {
    mockCommandsHas.mockReturnValue(true);
    render(<EditorToolbar onClose={onClose} />);
    mockRunCommand.mockClear();

    fireEvent.click(getIconButton('paintbrush'));
    expect(mockRunCommand).toHaveBeenCalledWith('core:open-styles-manager');
  });

  it('does not run a panel command when the editor reports it does not exist', () => {
    mockCommandsHas.mockReturnValue(false);
    render(<EditorToolbar onClose={onClose} />);

    expect(mockRunCommand).not.toHaveBeenCalled();
    expect(mockStopCommand).not.toHaveBeenCalled();
  });

  it('opens the code dialog from the toolbar button', () => {
    render(<EditorToolbar onClose={onClose} />);
    fireEvent.click(getIconButton('code'));
    expect(screen.getByTestId('code-dialog')).toBeInTheDocument();
  });

  it('opens the import dialog from the toolbar button', () => {
    render(<EditorToolbar onClose={onClose} />);
    fireEvent.click(getIconButton('upload'));
    expect(screen.getByTestId('import-dialog')).toBeInTheDocument();
  });

  it('opens the export dialog from the toolbar button', () => {
    render(<EditorToolbar onClose={onClose} />);
    fireEvent.click(getIconButton('download'));
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
  });

  it('renders the merge field picker', () => {
    render(<EditorToolbar onClose={onClose} />);
    expect(screen.getByTestId('merge-field-picker')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<EditorToolbar onClose={onClose} />);
    fireEvent.click(getIconButton('x'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens a confirmation dialog for the Clear-canvas button and does nothing until confirmed', () => {
    render(<EditorToolbar onClose={onClose} />);

    fireEvent.click(getIconButton('trash-2'));

    expect(screen.getByText('Clear canvas?')).toBeInTheDocument();
    expect(mockDomComponentsClear).not.toHaveBeenCalled();
  });

  it('clears the canvas and removes the localStorage draft when confirmed', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    render(<EditorToolbar onClose={onClose} />);

    fireEvent.click(getIconButton('trash-2'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(mockDomComponentsClear).toHaveBeenCalledTimes(1);
    expect(mockCssComposerClear).toHaveBeenCalledTimes(1);
    expect(mockUndoManagerClear).toHaveBeenCalledTimes(1);
    expect(removeItemSpy).toHaveBeenCalledWith('mp-template-editor');
  });

  it('swallows a localStorage.removeItem failure during Clear', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    render(<EditorToolbar onClose={onClose} />);

    fireEvent.click(getIconButton('trash-2'));

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Clear' }))).not.toThrow();
    expect(mockDomComponentsClear).toHaveBeenCalledTimes(1);
  });

  it('canceling the clear confirmation leaves the canvas untouched', () => {
    render(<EditorToolbar onClose={onClose} />);

    fireEvent.click(getIconButton('trash-2'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockDomComponentsClear).not.toHaveBeenCalled();
    expect(screen.queryByText('Clear canvas?')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const { mockSetComponents, mockLoadData } = vi.hoisted(() => ({
  mockSetComponents: vi.fn(),
  mockLoadData: vi.fn(),
}));

vi.mock('@grapesjs/react', () => ({
  useEditor: () => ({
    setComponents: mockSetComponents,
    loadData: mockLoadData,
  }),
}));

import { EditorImportDialog } from './editor-import-dialog';

describe('EditorImportDialog', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing meaningful when closed', () => {
    render(<EditorImportDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText('Import Template')).not.toBeInTheDocument();
  });

  it('disables the Import button until source text is entered', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/mjml/i), { target: { value: '<mjml></mjml>' } });
    expect(screen.getByRole('button', { name: 'Import' })).not.toBeDisabled();
  });

  it('imports MJML source via editor.setComponents by default', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByPlaceholderText(/mjml/i), { target: { value: '<mjml><mj-body/></mjml>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(mockSetComponents).toHaveBeenCalledWith('<mjml><mj-body/></mjml>');
    expect(mockLoadData).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('switches to JSON mode and loads valid JSON via editor.loadData', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'JSON State' }));
    const textarea = screen.getByPlaceholderText(/assets/i);
    fireEvent.change(textarea, { target: { value: '{"assets":[]}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(mockLoadData).toHaveBeenCalledWith({ assets: [] });
    expect(mockSetComponents).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows an error and does not close when JSON is invalid', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'JSON State' }));
    fireEvent.change(screen.getByPlaceholderText(/assets/i), { target: { value: 'not json' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByText(/Invalid JSON data/)).toBeInTheDocument();
    expect(mockLoadData).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does nothing when Import is clicked with only whitespace source', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByPlaceholderText(/mjml/i), { target: { value: '   ' } });
    // Button stays disabled for whitespace-only source.
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('switches from JSON mode back to MJML mode via the toggle', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'JSON State' }));
    fireEvent.click(screen.getByRole('button', { name: 'MJML Source' }));

    fireEvent.change(screen.getByPlaceholderText(/mjml/i), { target: { value: '<mjml/>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(mockSetComponents).toHaveBeenCalledWith('<mjml/>');
  });

  it('cancel closes without importing', () => {
    render(<EditorImportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockSetComponents).not.toHaveBeenCalled();
  });
});

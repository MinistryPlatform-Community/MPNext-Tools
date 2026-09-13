import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { mockGetHtml, mockSetComponents, mockEditor } = vi.hoisted(() => {
  const mockGetHtml = vi.fn();
  const mockSetComponents = vi.fn();
  // A single stable object reference — the component's effect depends on
  // `editor` by identity, so a fresh object literal per render would retrigger
  // the effect on every render and infinite-loop the test.
  return {
    mockGetHtml,
    mockSetComponents,
    mockEditor: { getHtml: mockGetHtml, setComponents: mockSetComponents },
  };
});

vi.mock('@grapesjs/react', () => ({
  useEditor: () => mockEditor,
}));

const { mockCompileMjml } = vi.hoisted(() => ({
  mockCompileMjml: vi.fn(),
}));

vi.mock('./actions', () => ({
  compileMjml: mockCompileMjml,
}));

const mockWriteText = vi.hoisted(() => vi.fn());

import { EditorCodeDialog } from './editor-code-dialog';

describe('EditorCodeDialog', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHtml.mockReturnValue('<mjml><mj-body/></mjml>');
    mockCompileMjml.mockResolvedValue({ html: '<html>ok</html>', errors: [] });
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<EditorCodeDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText('Code Editor')).not.toBeInTheDocument();
  });

  it('seeds the MJML textarea from editor.getHtml() when opened', () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);
    expect(screen.getByDisplayValue('<mjml><mj-body/></mjml>')).toBeInTheDocument();
  });

  it('applies edited MJML to the editor and closes the dialog', () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);

    const textarea = screen.getByDisplayValue('<mjml><mj-body/></mjml>');
    fireEvent.change(textarea, { target: { value: '<mjml><mj-body>edited</mj-body></mjml>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Editor' }));

    expect(mockSetComponents).toHaveBeenCalledWith('<mjml><mj-body>edited</mj-body></mjml>');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('copies the MJML source to the clipboard and shows Copied! feedback', async () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy MJML' }));

    expect(mockWriteText).toHaveBeenCalledWith('<mjml><mj-body/></mjml>');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('compiles HTML automatically on first switch to the HTML tab', async () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));

    expect(screen.getByText(/Compiling MJML/)).toBeInTheDocument();
    await waitFor(() => expect(mockCompileMjml).toHaveBeenCalledWith('<mjml><mj-body/></mjml>'));
    expect(await screen.findByDisplayValue('<html>ok</html>')).toBeInTheDocument();
  });

  it('does not recompile automatically the second time the HTML tab is opened', async () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));
    await screen.findByDisplayValue('<html>ok</html>');
    expect(mockCompileMjml).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'MJML Source' }));
    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));

    expect(mockCompileMjml).toHaveBeenCalledTimes(1);
  });

  it('shows compile warnings returned alongside html', async () => {
    mockCompileMjml.mockResolvedValueOnce({
      html: '<html>partial</html>',
      errors: [{ line: 1, message: 'bad', tagName: 'mj-x', formattedMessage: 'Line 1: bad' }],
    });

    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));

    expect(await screen.findByText('Line 1: bad')).toBeInTheDocument();
  });

  it('shows an error message when compileMjml rejects', async () => {
    mockCompileMjml.mockRejectedValueOnce(new Error('boom'));

    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('falls back to a generic message when compileMjml throws a non-Error', async () => {
    mockCompileMjml.mockRejectedValueOnce('nope');

    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));

    expect(await screen.findByText('Compilation failed')).toBeInTheDocument();
  });

  it('recompile button re-invokes compileMjml and copy button copies html output', async () => {
    render(<EditorCodeDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML Preview' }));
    await screen.findByDisplayValue('<html>ok</html>');

    fireEvent.click(screen.getByRole('button', { name: 'Recompile' }));
    await waitFor(() => expect(mockCompileMjml).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Copy HTML' }));
    expect(mockWriteText).toHaveBeenCalledWith('<html>ok</html>');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { mockGetHtml, mockGetProjectData, mockEditor } = vi.hoisted(() => {
  const mockGetHtml = vi.fn();
  const mockGetProjectData = vi.fn();
  // A single stable object reference — the component's effect depends on
  // `editor` by identity, so a fresh object literal per render would retrigger
  // the effect on every render and infinite-loop the test.
  return {
    mockGetHtml,
    mockGetProjectData,
    mockEditor: { getHtml: mockGetHtml, getProjectData: mockGetProjectData },
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

import { EditorExportDialog } from './editor-export-dialog';

describe('EditorExportDialog', () => {
  const onOpenChange = vi.fn();
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHtml.mockReturnValue('<mjml><mj-body/></mjml>');
    mockGetProjectData.mockReturnValue({ pages: [] });
    mockCompileMjml.mockResolvedValue({ html: '<html>ok</html>', errors: [] });
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
    mockWriteText.mockResolvedValue(undefined);

    createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURL = vi.fn();
    // jsdom does not implement these.
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<EditorExportDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText('Export Template')).not.toBeInTheDocument();
  });

  it('seeds MJML and JSON state from the editor when opened', () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);

    expect(screen.getByDisplayValue('<mjml><mj-body/></mjml>')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(JSON.stringify({ pages: [] }, null, 2));
  });

  it('compiles HTML automatically the first time the HTML tab is opened', async () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HTML' }));
    expect(screen.getByText('Compiling...')).toBeInTheDocument();

    await waitFor(() => expect(mockCompileMjml).toHaveBeenCalledWith('<mjml><mj-body/></mjml>'));
    expect(await screen.findByDisplayValue('<html>ok</html>')).toBeInTheDocument();
  });

  it('shows a generic message for non-Error rejections', async () => {
    mockCompileMjml.mockRejectedValueOnce('nope');

    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText('Compilation failed')).toBeInTheDocument();
  });

  it('shows compile warnings returned alongside a successful compile', async () => {
    mockCompileMjml.mockResolvedValueOnce({
      html: '<html>partial</html>',
      errors: [{ line: 2, message: 'bad', tagName: 'mj-x', formattedMessage: 'Line 2: bad' }],
    });

    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText('Line 2: bad')).toBeInTheDocument();
  });

  it('clicking the already-active MJML tab is a no-op that stays on MJML', () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'MJML' }));
    expect(screen.getByDisplayValue('<mjml><mj-body/></mjml>')).toBeInTheDocument();
  });

  it('copies MJML source to the clipboard', async () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy MJML' }));

    expect(mockWriteText).toHaveBeenCalledWith('<mjml><mj-body/></mjml>');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('recompile button is disabled while compiling and copy HTML disabled until output exists', async () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'HTML' }));

    // While compiling, Recompile/Copy controls are not present (spinner shown instead).
    expect(screen.queryByRole('button', { name: 'Recompile' })).not.toBeInTheDocument();

    await screen.findByDisplayValue('<html>ok</html>');
    fireEvent.click(screen.getByRole('button', { name: 'Copy HTML' }));
    expect(mockWriteText).toHaveBeenCalledWith('<html>ok</html>');

    fireEvent.click(screen.getByRole('button', { name: 'Recompile' }));
    await waitFor(() => expect(mockCompileMjml).toHaveBeenCalledTimes(2));
  });

  it('copies JSON state to the clipboard', async () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));

    expect(mockWriteText).toHaveBeenCalledWith(JSON.stringify({ pages: [] }, null, 2));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('downloads the JSON state as a file via an anchor click, then revokes the object URL', () => {
    render(<EditorExportDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

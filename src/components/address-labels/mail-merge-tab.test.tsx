import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { MailMergeTab } from './mail-merge-tab';
import type { LabelConfig, LabelData, SkipRecord } from '@/lib/dto';

const mockGenerateSampleTemplate = vi.hoisted(() => vi.fn());
const mockMergeTemplate = vi.hoisted(() => vi.fn());

vi.mock('./sample-template', () => ({
  generateSampleTemplate: mockGenerateSampleTemplate,
}));

vi.mock('./actions', () => ({
  mergeTemplate: mockMergeTemplate,
}));

const mockCreateObjectURL = vi.hoisted(() => vi.fn(() => 'blob:mock-url'));
const mockRevokeObjectURL = vi.hoisted(() => vi.fn());
const mockAnchorClick = vi.hoisted(() => vi.fn());

const printable: LabelData[] = [
  { name: 'Jane Doe', addressLine1: '123 Main St', city: 'Chicago', state: 'IL', postalCode: '60601' },
];
const skipped: SkipRecord[] = [];
const baseConfig: LabelConfig = {
  stockId: '5160',
  addressMode: 'household',
  startPosition: 1,
  includeMissingBarcodes: true,
  barcodeFormat: 'postnet',
  mailerId: '',
  serviceType: '040',
};

function makeDocxFile(name: string, sizeBytes: number): File {
  const content = new Uint8Array(Math.max(sizeBytes, 1));
  const file = new File([content], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = mockCreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL;
  HTMLAnchorElement.prototype.click = mockAnchorClick;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MailMergeTab', () => {
  it('renders the summary and a disabled Merge button with no template selected', () => {
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    expect(screen.getByText('1 label ready to print')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merge & download/i })).toBeDisabled();
  });

  it('downloads a sample template on click and revokes the object URL after the timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGenerateSampleTemplate.mockResolvedValue(Buffer.from('sample-docx').toString('base64'));
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);

    fireEvent.click(screen.getByRole('button', { name: /download sample template/i }));

    await waitFor(() => expect(mockCreateObjectURL).toHaveBeenCalled());
    expect(mockAnchorClick).toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    vi.useRealTimers();
  });

  it('shows an error when sample template generation fails', async () => {
    mockGenerateSampleTemplate.mockRejectedValue(new Error('template gen failed'));
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);

    fireEvent.click(screen.getByRole('button', { name: /download sample template/i }));

    expect(await screen.findByText('template gen failed')).toBeInTheDocument();
  });

  it('shows a fallback error message for a non-Error sample template rejection', async () => {
    mockGenerateSampleTemplate.mockRejectedValue('nope');
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);

    fireEvent.click(screen.getByRole('button', { name: /download sample template/i }));

    expect(await screen.findByText('Failed to generate template')).toBeInTheDocument();
  });

  it('rejects a non-.docx file', async () => {
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = new File(['x'], 'template.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Please select a .docx file')).toBeInTheDocument();
  });

  it('rejects a file over the 5MB limit', async () => {
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('big.docx', 6 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Template file must be under 5MB')).toBeInTheDocument();
  });

  it('accepts a valid .docx file, shows its name, and enables Merge', async () => {
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/template\.docx/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: /merge & download/i })).toBeEnabled());
  });

  it('shows an error and clears the selection when reading the template file fails', async () => {
    const OriginalFileReader = globalThis.FileReader;
    class FailingFileReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    // @ts-expect-error -- minimal stub is sufficient for the code under test
    globalThis.FileReader = FailingFileReader;

    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Failed to read file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merge & download/i })).toBeDisabled();

    globalThis.FileReader = OriginalFileReader;
  });

  it('clears the selected file when the file input is cleared', () => {
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);

    fireEvent.change(input, { target: { files: [] } });

    expect(screen.getByRole('button', { name: /merge & download/i })).toBeDisabled();
  });

  it('requires a valid mailerId before merging when barcodeFormat is imb', async () => {
    render(
      <MailMergeTab
        printable={printable}
        skipped={skipped}
        config={{ ...baseConfig, barcodeFormat: 'imb', mailerId: '123' }}
      />
    );
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /merge & download/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /merge & download/i }));

    expect(await screen.findByText('IMb requires a 6 or 9 digit USPS Mailer ID')).toBeInTheDocument();
    expect(mockMergeTemplate).not.toHaveBeenCalled();
  });

  it('merges and downloads the result on success', async () => {
    mockMergeTemplate.mockResolvedValue({
      success: true,
      data: Buffer.from('merged-doc').toString('base64'),
    });
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /merge & download/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /merge & download/i }));

    await waitFor(() => expect(mockMergeTemplate).toHaveBeenCalled());
    await waitFor(() => expect(mockAnchorClick).toHaveBeenCalled());
  });

  it('shows the server error when mergeTemplate returns success: false', async () => {
    mockMergeTemplate.mockResolvedValue({ success: false, error: 'Template error: bad tag' });
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /merge & download/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /merge & download/i }));

    expect(await screen.findByText('Template error: bad tag')).toBeInTheDocument();
  });

  it('shows a fallback error message when mergeTemplate rejects with a non-Error', async () => {
    mockMergeTemplate.mockRejectedValue('boom');
    render(<MailMergeTab printable={printable} skipped={skipped} config={baseConfig} />);
    const input = screen.getByLabelText(/upload your template/i);
    const file = makeDocxFile('template.docx', 1024);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /merge & download/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /merge & download/i }));

    expect(await screen.findByText('Merge failed')).toBeInTheDocument();
  });

  it('does nothing when Merge is clicked with no printable labels', () => {
    render(<MailMergeTab printable={[]} skipped={skipped} config={baseConfig} />);
    // Merge button stays disabled since printable.length === 0
    expect(screen.getByRole('button', { name: /merge & download/i })).toBeDisabled();
  });
});

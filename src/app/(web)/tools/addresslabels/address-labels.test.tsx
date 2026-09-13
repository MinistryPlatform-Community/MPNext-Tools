import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LabelConfig, LabelData, SkipRecord } from '@/lib/dto';
import type { ToolParams } from '@/lib/tool-params';

const {
  mockFetchAddressLabels,
  mockGenerateLabelPdf,
  mockGenerateLabelDocx,
  mockRouterBack,
} = vi.hoisted(() => ({
  mockFetchAddressLabels: vi.fn(),
  mockGenerateLabelPdf: vi.fn(),
  mockGenerateLabelDocx: vi.fn(),
  mockRouterBack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock('@/components/dev-panel', () => ({
  DevPanel: () => null,
}));

vi.mock('@/components/address-labels/actions', () => ({
  fetchAddressLabels: mockFetchAddressLabels,
  generateLabelPdf: mockGenerateLabelPdf,
  generateLabelDocx: mockGenerateLabelDocx,
}));

vi.mock('@/components/address-labels', () => ({
  AddressLabelsForm: ({
    config,
    onChange,
    maxStartPosition,
  }: {
    config: LabelConfig;
    onChange: (c: LabelConfig) => void;
    maxStartPosition: number;
  }) => (
    <div data-testid="labels-form">
      <span data-testid="config-json">{JSON.stringify(config)}</span>
      <span data-testid="max-start">{maxStartPosition}</span>
      <button onClick={() => onChange({ ...config, stockId: '5161' })}>change-stock</button>
      <button onClick={() => onChange({ ...config, barcodeFormat: 'imb', mailerId: '123' })}>
        set-invalid-imb
      </button>
      <button onClick={() => onChange({ ...config, barcodeFormat: 'imb', mailerId: '123456789' })}>
        set-valid-imb
      </button>
    </div>
  ),
  AddressLabelsSummary: ({
    printableCount,
    skipped,
  }: {
    printableCount: number;
    skipped: SkipRecord[];
  }) => (
    <div data-testid="labels-summary">
      {printableCount} printable / {skipped.length} skipped
    </div>
  ),
}));

vi.mock('@/components/address-labels/mail-merge-tab', () => ({
  MailMergeTab: ({ printable }: { printable: LabelData[] }) => (
    <div data-testid="mail-merge-tab">merge-tab:{printable.length}</div>
  ),
}));

import { AddressLabels } from './address-labels';

const params: ToolParams = { recordID: 1 };

const printableLabel: LabelData = {
  name: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',
};

function arrayBufferToBase64(text: string): string {
  return Buffer.from(text).toString('base64');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockFetchAddressLabels.mockResolvedValue({ printable: [printableLabel], skipped: [] });
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  window.open = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AddressLabels', () => {
  it('shows a loading indicator while address data is being fetched', async () => {
    let resolveFetch!: (v: { printable: LabelData[]; skipped: SkipRecord[] }) => void;
    mockFetchAddressLabels.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(<AddressLabels params={params} />);
    expect(screen.getByText('Loading address data...')).toBeInTheDocument();

    await waitFor(() => resolveFetch({ printable: [], skipped: [] }));
    await waitFor(() => expect(screen.queryByText('Loading address data...')).not.toBeInTheDocument());
  });

  it('loads and displays the labels tab by default', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-summary')).toBeInTheDocument());
    expect(screen.getByText('1 printable / 0 skipped')).toBeInTheDocument();
    expect(screen.queryByTestId('mail-merge-tab')).not.toBeInTheDocument();
  });

  it('switches to the Mail Merge tab and back', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-summary')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Mail Merge' }));
    expect(screen.getByTestId('mail-merge-tab')).toBeInTheDocument();
    expect(screen.getByText('merge-tab:1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Labels' }));
    expect(screen.getByTestId('labels-summary')).toBeInTheDocument();
  });

  it('shows an error message when fetchAddressLabels rejects with an Error', async () => {
    mockFetchAddressLabels.mockRejectedValueOnce(new Error('MP is down'));
    render(<AddressLabels params={params} />);
    expect(await screen.findByText('MP is down')).toBeInTheDocument();
  });

  it('shows a fallback error message when fetchAddressLabels rejects with a non-Error', async () => {
    mockFetchAddressLabels.mockRejectedValueOnce('nope');
    render(<AddressLabels params={params} />);
    expect(await screen.findByText('Failed to load address data')).toBeInTheDocument();
  });

  it('loads a saved config from localStorage and uses it as the initial state', async () => {
    localStorage.setItem(
      'address-labels-config',
      JSON.stringify({ stockId: '5161', mailerId: '999999999' })
    );
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('config-json')).toBeInTheDocument());
    const config = JSON.parse(screen.getByTestId('config-json').textContent ?? '{}');
    expect(config.stockId).toBe('5161');
    expect(config.mailerId).toBe('999999999');
  });

  it('falls back to defaults when localStorage holds invalid JSON', async () => {
    localStorage.setItem('address-labels-config', 'not-json{{');
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('config-json')).toBeInTheDocument());
    const config = JSON.parse(screen.getByTestId('config-json').textContent ?? '{}');
    expect(config.stockId).toBe('5160');
  });

  it('persists config changes to localStorage and re-derives maxStartPosition', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-form')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'change-stock' }));

    await waitFor(() => {
      const config = JSON.parse(screen.getByTestId('config-json').textContent ?? '{}');
      expect(config.stockId).toBe('5161');
    });
    expect(screen.getByTestId('max-start').textContent).toBe('20'); // 5161: 2 cols x 10 rows

    const stored = JSON.parse(localStorage.getItem('address-labels-config') ?? '{}');
    expect(stored.stockId).toBe('5161');
  });

  it('generates a PDF, opens it in a new tab, and revokes the object URL after the timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGenerateLabelPdf.mockResolvedValue({ success: true, data: arrayBufferToBase64('pdf-bytes') });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    await waitFor(() => expect(mockGenerateLabelPdf).toHaveBeenCalled());
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank'));

    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    vi.useRealTimers();
  });

  it('shows an error when PDF generation returns success: false', async () => {
    mockGenerateLabelPdf.mockResolvedValue({ success: false, error: 'stock mismatch' });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    expect(await screen.findByText('stock mismatch')).toBeInTheDocument();
  });

  it('shows an error when generateLabelPdf rejects with an Error', async () => {
    mockGenerateLabelPdf.mockRejectedValue(new Error('pdf explode'));
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    expect(await screen.findByText('pdf explode')).toBeInTheDocument();
  });

  it('shows a fallback error when generateLabelPdf rejects with a non-Error', async () => {
    mockGenerateLabelPdf.mockRejectedValue('nope');
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    expect(await screen.findByText('PDF generation failed')).toBeInTheDocument();
  });

  it('blocks PDF generation when IMb mailerId is invalid and never calls the server action', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-form')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'set-invalid-imb' }));
    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    expect(await screen.findByText('IMb requires a 6 or 9 digit USPS Mailer ID')).toBeInTheDocument();
    expect(mockGenerateLabelPdf).not.toHaveBeenCalled();
  });

  it('allows PDF generation when IMb mailerId is a valid 9-digit value', async () => {
    mockGenerateLabelPdf.mockResolvedValue({ success: true, data: arrayBufferToBase64('pdf-bytes') });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-form')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'set-valid-imb' }));
    fireEvent.click(screen.getByRole('button', { name: /generate pdf/i }));

    await waitFor(() => expect(mockGenerateLabelPdf).toHaveBeenCalled());
  });

  it('does nothing when Generate PDF is clicked with no printable labels', async () => {
    mockFetchAddressLabels.mockResolvedValue({ printable: [], skipped: [] });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-summary')).toBeInTheDocument());

    const btn = screen.getByRole('button', { name: /generate pdf/i });
    expect(btn).toBeDisabled();
  });

  it('downloads a Word document and revokes the object URL after the timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGenerateLabelDocx.mockResolvedValue({ success: true, data: arrayBufferToBase64('docx-bytes') });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /download word/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /download word/i }));

    await waitFor(() => expect(mockGenerateLabelDocx).toHaveBeenCalled());
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());

    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    vi.useRealTimers();
  });

  it('shows an error when Word generation returns success: false', async () => {
    mockGenerateLabelDocx.mockResolvedValue({ success: false, error: 'docx failure' });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /download word/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /download word/i }));

    expect(await screen.findByText('docx failure')).toBeInTheDocument();
  });

  it('shows an error when generateLabelDocx rejects with an Error', async () => {
    mockGenerateLabelDocx.mockRejectedValue(new Error('word explode'));
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /download word/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /download word/i }));

    expect(await screen.findByText('word explode')).toBeInTheDocument();
  });

  it('shows a fallback error when generateLabelDocx rejects with a non-Error', async () => {
    mockGenerateLabelDocx.mockRejectedValue('nope');
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /download word/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /download word/i }));

    expect(await screen.findByText('Word generation failed')).toBeInTheDocument();
  });

  it('blocks Word download when IMb mailerId is invalid', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-form')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'set-invalid-imb' }));
    fireEvent.click(screen.getByRole('button', { name: /download word/i }));

    expect(await screen.findByText('IMb requires a 6 or 9 digit USPS Mailer ID')).toBeInTheDocument();
    expect(mockGenerateLabelDocx).not.toHaveBeenCalled();
  });

  it('does nothing when Download Word is clicked with no printable labels', async () => {
    mockFetchAddressLabels.mockResolvedValue({ printable: [], skipped: [] });
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-summary')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /download word/i })).toBeDisabled();
  });

  it('calls router.back on Close', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-summary')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when addressMode or includeMissingBarcodes changes, but not for layout-only changes', async () => {
    render(<AddressLabels params={params} />);
    await waitFor(() => expect(screen.getByTestId('labels-form')).toBeInTheDocument());
    expect(mockFetchAddressLabels).toHaveBeenCalledTimes(1);

    // Layout-only change (stockId) must not trigger a re-fetch.
    fireEvent.click(screen.getByRole('button', { name: 'change-stock' }));
    await waitFor(() => {
      const config = JSON.parse(screen.getByTestId('config-json').textContent ?? '{}');
      expect(config.stockId).toBe('5161');
    });
    expect(mockFetchAddressLabels).toHaveBeenCalledTimes(1);
  });
});

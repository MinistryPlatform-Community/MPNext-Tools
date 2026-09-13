import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// react-pdf's View/Text accept array `style` props (merged internally by the
// PDF renderer); real DOM elements don't support that, so the mock flattens
// array styles into a single object the way react-pdf effectively does.
function flattenStyle(style: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(style)) return Object.assign({}, ...style);
  return style as Record<string, unknown> | undefined;
}

vi.mock('@react-pdf/renderer', () => ({
  View: ({ style, children, ...props }: { style?: unknown; children?: React.ReactNode }) => (
    <div style={flattenStyle(style)} {...props}>{children}</div>
  ),
  Text: ({ style, children, ...props }: { style?: unknown; children?: React.ReactNode }) => (
    <span style={flattenStyle(style)} {...props}>{children}</span>
  ),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

vi.mock('./imb-barcode', () => ({
  ImbBarcode: ({ barStates }: { barStates: string }) => (
    <div data-testid="imb-barcode">{barStates}</div>
  ),
}));

vi.mock('./postnet-barcode', () => ({
  PostnetBarcode: ({ barStates }: { barStates: string }) => (
    <div data-testid="postnet-barcode">{barStates}</div>
  ),
}));

import { AddressLabel } from './address-label';
import type { LabelData } from '@/lib/dto';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseLabel: LabelData = {
  name: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',
};

describe('AddressLabel', () => {
  it('renders name, address line 1, and city/state/zip', () => {
    render(<AddressLabel data={baseLabel} width={189} height={72} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === 'Chicago, IL  60601')).toBeInTheDocument();
  });

  it('renders address line 2 when present', () => {
    render(<AddressLabel data={{ ...baseLabel, addressLine2: 'Suite 200' }} width={189} height={72} />);
    expect(screen.getByText('Suite 200')).toBeInTheDocument();
  });

  it('omits address line 2 when absent', () => {
    render(<AddressLabel data={baseLabel} width={189} height={72} />);
    expect(screen.queryByText('Suite 200')).not.toBeInTheDocument();
  });

  it('omits city/state when missing', () => {
    render(
      <AddressLabel
        data={{ ...baseLabel, city: '', state: '', postalCode: '' }}
        width={189}
        height={72}
      />
    );
    // cityStateZip joins to an empty string when all three parts are falsy
    expect(screen.queryByText('Chicago, IL  60601')).not.toBeInTheDocument();
  });

  it('renders IMb barcode when barType is imb and barStates present', () => {
    render(
      <AddressLabel
        data={{ ...baseLabel, barStates: 'T'.repeat(65), barType: 'imb' }}
        width={189}
        height={72}
      />
    );
    expect(screen.getByTestId('imb-barcode')).toBeInTheDocument();
    expect(screen.queryByTestId('postnet-barcode')).not.toBeInTheDocument();
  });

  it('renders POSTNET barcode when barType is postnet and barStates present', () => {
    render(
      <AddressLabel
        data={{ ...baseLabel, barStates: '["tall","short"]', barType: 'postnet' }}
        width={189}
        height={72}
      />
    );
    expect(screen.getByTestId('postnet-barcode')).toBeInTheDocument();
    expect(screen.queryByTestId('imb-barcode')).not.toBeInTheDocument();
  });

  it('renders no barcode when barStates is absent', () => {
    render(<AddressLabel data={baseLabel} width={189} height={72} />);
    expect(screen.queryByTestId('imb-barcode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('postnet-barcode')).not.toBeInTheDocument();
  });
});

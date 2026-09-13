import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * `View` is a react-pdf primitive with no DOM equivalent. Mapping it to the
 * literal string 'View' made React treat it as a capitalised unknown HTML tag
 * and log two warnings per rendered element — ~800 lines of noise across the
 * suite for a single 65-bar barcode.
 *
 * The tag name needs a dash: React renders a hyphenated name as a custom
 * element without complaint, whereas any undashed unknown tag (`view`
 * included) still draws "The tag <x> is unrecognized in this browser".
 */
vi.mock('@react-pdf/renderer', () => ({
  View: 'rpdf-view',
}));

import { ImbBarcode } from './imb-barcode';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const VALID_BAR_STATES = 'T'.repeat(65);

describe('ImbBarcode', () => {
  it('renders null when barStates is empty', () => {
    const { container } = render(<ImbBarcode barStates="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when barStates is not 65 characters', () => {
    const { container } = render(<ImbBarcode barStates="TDAF" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 65 bars for a valid bar state string', () => {
    const { container } = render(<ImbBarcode barStates={VALID_BAR_STATES} />);
    // One outer View + 65 inner bar Views, each with a nested pad + bar View.
    const views = container.querySelectorAll('rpdf-view');
    // outer(1) + per-bar wrapper(65) + pad(65) + bar(65) = 196
    expect(views.length).toBe(1 + 65 * 3);
  });

  it('renders all four bar state types without error', () => {
    const mixed = ('T'.repeat(17) + 'D'.repeat(16) + 'A'.repeat(16) + 'F'.repeat(16)).slice(0, 65);
    const { container } = render(<ImbBarcode barStates={mixed} />);
    expect(container.querySelectorAll('rpdf-view').length).toBeGreaterThan(0);
  });

  it('skips a bar when the state character is unrecognized', () => {
    const withInvalid = 'X' + 'T'.repeat(64);
    const { container } = render(<ImbBarcode barStates={withInvalid} />);
    // outer(1) + 64 valid bars * 3 nested views (unrecognized char renders null, no nested views)
    const views = container.querySelectorAll('rpdf-view');
    expect(views.length).toBe(1 + 64 * 3);
  });

  it('applies custom width and height', () => {
    const { container } = render(<ImbBarcode barStates={VALID_BAR_STATES} width={200} height={20} />);
    const outer = container.querySelector('rpdf-view');
    expect(outer).not.toBeNull();
  });
});

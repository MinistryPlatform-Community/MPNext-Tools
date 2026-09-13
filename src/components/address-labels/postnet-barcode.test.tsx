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

import { PostnetBarcode } from './postnet-barcode';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PostnetBarcode', () => {
  it('renders null for invalid JSON', () => {
    const { container } = render(<PostnetBarcode barStates="not-json" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when parsed value is not an array', () => {
    const { container } = render(<PostnetBarcode barStates={JSON.stringify({ a: 1 })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when parsed array is empty', () => {
    const { container } = render(<PostnetBarcode barStates="[]" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one bar per entry for a valid tall/short array', () => {
    const bars = ['tall', 'short', 'tall', 'short', 'tall'];
    const { container } = render(<PostnetBarcode barStates={JSON.stringify(bars)} />);
    // outer View + one wrapper View per bar + one inner bar View per bar
    const views = container.querySelectorAll('rpdf-view');
    expect(views.length).toBe(1 + bars.length * 2);
  });

  it('applies custom width and height', () => {
    const bars = ['tall', 'short'];
    const { container } = render(
      <PostnetBarcode barStates={JSON.stringify(bars)} width={240} height={16} />
    );
    expect(container.querySelector('rpdf-view')).not.toBeNull();
  });
});

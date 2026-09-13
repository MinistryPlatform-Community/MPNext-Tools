import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { AddressLabelsForm } from './address-labels-form';
import type { LabelConfig } from '@/lib/dto';

// jsdom does not implement these APIs that Radix Select/pointer-based
// primitives call during open/close and scroll positioning.
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseConfig: LabelConfig = {
  stockId: '5160',
  addressMode: 'household',
  startPosition: 1,
  includeMissingBarcodes: true,
  barcodeFormat: 'postnet',
  mailerId: '',
  serviceType: '040',
};

describe('AddressLabelsForm', () => {
  it('renders the current config values', () => {
    render(<AddressLabelsForm config={baseConfig} onChange={vi.fn()} maxStartPosition={30} />);
    expect(screen.getByLabelText('Start Position')).toHaveValue(1);
    expect(screen.getByLabelText('Household')).toBeChecked();
    expect(screen.getByLabelText('POSTNET')).toBeChecked();
  });

  it('does not show the IMb fields when barcodeFormat is not imb', () => {
    render(<AddressLabelsForm config={baseConfig} onChange={vi.fn()} maxStartPosition={30} />);
    expect(screen.queryByLabelText('USPS Mailer ID')).not.toBeInTheDocument();
  });

  it('shows the IMb fields when barcodeFormat is imb', () => {
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb' }}
        onChange={vi.fn()}
        maxStartPosition={30}
      />
    );
    expect(screen.getByLabelText('USPS Mailer ID')).toBeInTheDocument();
  });

  it('updates startPosition on input change, clamped within [1, maxStartPosition]', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.change(screen.getByLabelText('Start Position'), { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startPosition: 15 }));
  });

  it('clamps startPosition above maxStartPosition down to the max', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.change(screen.getByLabelText('Start Position'), { target: { value: '999' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startPosition: 30 }));
  });

  it('clamps a non-numeric startPosition input down to 1', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.change(screen.getByLabelText('Start Position'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startPosition: 1 }));
  });

  it('switches addressMode via the radio group', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.click(screen.getByLabelText('Individual'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ addressMode: 'individual' }));
  });

  it('switches barcodeFormat via the radio group', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.click(screen.getByLabelText('Intelligent Mail (IMb)'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ barcodeFormat: 'imb' }));
  });

  it('strips non-digit characters and caps mailerId at 9 characters', () => {
    const onChange = vi.fn();
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb' }}
        onChange={onChange}
        maxStartPosition={30}
      />
    );

    fireEvent.change(screen.getByLabelText('USPS Mailer ID'), {
      target: { value: '12a3-4567890' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mailerId: '123456789' }));
  });

  it('shows a warning when mailerId length is neither 6 nor 9', () => {
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb', mailerId: '12345' }}
        onChange={vi.fn()}
        maxStartPosition={30}
      />
    );
    expect(screen.getByText('Must be 6 or 9 digits')).toBeInTheDocument();
  });

  it('shows no warning when mailerId is empty', () => {
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb', mailerId: '' }}
        onChange={vi.fn()}
        maxStartPosition={30}
      />
    );
    expect(screen.queryByText('Must be 6 or 9 digits')).not.toBeInTheDocument();
  });

  it('shows no warning when mailerId is a valid 6-digit value', () => {
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb', mailerId: '123456' }}
        onChange={vi.fn()}
        maxStartPosition={30}
      />
    );
    expect(screen.queryByText('Must be 6 or 9 digits')).not.toBeInTheDocument();
  });

  it('toggles includeMissingBarcodes via the checkbox', () => {
    const onChange = vi.fn();
    render(<AddressLabelsForm config={baseConfig} onChange={onChange} maxStartPosition={30} />);

    fireEvent.click(screen.getByLabelText('Include labels without barcodes'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ includeMissingBarcodes: false }));
  });

  it('changes the label stock via the select and resets startPosition to 1', () => {
    const onChange = vi.fn();
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, startPosition: 5 }}
        onChange={onChange}
        maxStartPosition={30}
      />
    );

    fireEvent.click(screen.getByLabelText('Label Stock'));
    const option = screen.getByRole('option', { name: /Avery 5161/i });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ stockId: '5161', startPosition: 1 })
    );
  });

  it('changes the service type via the select', () => {
    const onChange = vi.fn();
    render(
      <AddressLabelsForm
        config={{ ...baseConfig, barcodeFormat: 'imb' }}
        onChange={onChange}
        maxStartPosition={30}
      />
    );

    fireEvent.click(screen.getByLabelText('Service Type'));
    const option = screen.getByRole('option', { name: /Priority Mail/i });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ serviceType: '200' }));
  });
});

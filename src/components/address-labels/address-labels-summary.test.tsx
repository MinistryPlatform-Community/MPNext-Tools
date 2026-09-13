import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { AddressLabelsSummary } from './address-labels-summary';
import type { SkipRecord } from '@/lib/dto';

afterEach(() => {
  cleanup();
});

describe('AddressLabelsSummary', () => {
  it('shows singular label count', () => {
    render(<AddressLabelsSummary printableCount={1} skipped={[]} />);
    expect(screen.getByText('1 label ready to print')).toBeInTheDocument();
  });

  it('shows plural label count', () => {
    render(<AddressLabelsSummary printableCount={3} skipped={[]} />);
    expect(screen.getByText('3 labels ready to print')).toBeInTheDocument();
  });

  it('shows zero labels as plural', () => {
    render(<AddressLabelsSummary printableCount={0} skipped={[]} />);
    expect(screen.getByText('0 labels ready to print')).toBeInTheDocument();
  });

  it('does not show skipped section when there are no skipped records', () => {
    render(<AddressLabelsSummary printableCount={5} skipped={[]} />);
    expect(screen.queryByText(/skipped/)).not.toBeInTheDocument();
  });

  it('groups skipped records by reason with known labels', () => {
    const skipped: SkipRecord[] = [
      { name: 'A', contactId: 1, reason: 'no_address' },
      { name: 'B', contactId: 2, reason: 'no_address' },
      { name: 'C', contactId: 3, reason: 'opted_out' },
    ];
    render(<AddressLabelsSummary printableCount={2} skipped={skipped} />);
    expect(screen.getByText('3 skipped')).toBeInTheDocument();
    expect(screen.getByText('(2 Missing address)')).toBeInTheDocument();
    expect(screen.getByText('(1 Opted out of bulk mail)')).toBeInTheDocument();
  });

  it('falls back to the raw reason string for an unknown reason', () => {
    const skipped = [
      { name: 'Z', contactId: 9, reason: 'some_unknown_reason' } as unknown as SkipRecord,
    ];
    render(<AddressLabelsSummary printableCount={0} skipped={skipped} />);
    expect(screen.getByText('(1 some_unknown_reason)')).toBeInTheDocument();
  });

  it('toggles the skipped record list open and closed', () => {
    const skipped: SkipRecord[] = [
      { name: 'Jane Doe', contactId: 1, reason: 'no_postal_code' },
    ];
    render(<AddressLabelsSummary printableCount={1} skipped={skipped} />);

    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /view skipped records/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide skipped records/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide skipped records/i }));
    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
  });

  it('renders the reason label for each skipped record row using fallback for unknown reasons', () => {
    const skipped = [
      { name: 'Weird Case', contactId: 5, reason: 'totally_unknown' } as unknown as SkipRecord,
    ];
    render(<AddressLabelsSummary printableCount={0} skipped={skipped} />);
    fireEvent.click(screen.getByRole('button', { name: /view skipped records/i }));
    expect(screen.getByText(/Weird Case — totally_unknown/)).toBeInTheDocument();
  });
});

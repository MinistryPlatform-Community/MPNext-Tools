import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { MessageCurfewWindow } from '@/lib/dto';
import { CurfewNotice } from './curfew-notice';

const curfew: MessageCurfewWindow = { start: '19:00', end: '08:00' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderNotice(overrides: Partial<React.ComponentProps<typeof CurfewNotice>> = {}) {
  const props = {
    curfew,
    startInCurfew: true,
    endInCurfew: false,
    scheduled: true,
    acknowledged: false,
    onAcknowledgedChange: vi.fn(),
    ...overrides,
  };
  render(<CurfewNotice {...props} />);
  return props;
}

describe('CurfewNotice', () => {
  it('names the quiet-hours window and the override wording', () => {
    renderNotice();

    expect(screen.getByText('Sending during quiet hours')).toBeInTheDocument();
    expect(
      screen.getByText(/This message is set to start during your church's quiet hours \(7:00 PM to 8:00 AM\)\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/Recipients may not want texts at this time\./)).toBeInTheDocument();
    expect(
      screen.getByText('I understand and want to deliver this text outside of messaging quiet hours.')
    ).toBeInTheDocument();
  });

  it('says "send" instead of "start" for an immediate send', () => {
    renderNotice({ scheduled: false });

    expect(
      screen.getByText(/This message is set to send during your church's quiet hours \(7:00 PM to 8:00 AM\)\./)
    ).toBeInTheDocument();
  });

  it('covers both boundaries when the send starts and finishes inside the window', () => {
    renderNotice({ startInCurfew: true, endInCurfew: true });

    expect(
      screen.getByText(/This message would send and finish during your church's quiet hours \(7:00 PM to 8:00 AM\)\./)
    ).toBeInTheDocument();
  });

  it('warns about the tail when only the estimated completion is inside the window', () => {
    renderNotice({ startInCurfew: false, endInCurfew: true });

    expect(
      screen.getByText(/This message would still be sending during your church's quiet hours \(7:00 PM to 8:00 AM\)\./)
    ).toBeInTheDocument();
  });

  it('reports the window with a different curfew configuration', () => {
    renderNotice({ curfew: { start: '21:30', end: '06:15' } });

    expect(screen.getByText(/9:30 PM to 6:15 AM/)).toBeInTheDocument();
  });

  it('calls back with true when the override is checked', () => {
    const { onAcknowledgedChange } = renderNotice();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);

    expect(onAcknowledgedChange).toHaveBeenCalledWith(true);
  });

  it('calls back with false when a checked override is cleared', () => {
    const { onAcknowledgedChange } = renderNotice({ acknowledged: true });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);

    expect(onAcknowledgedChange).toHaveBeenCalledWith(false);
  });

  it('disables the override while the form is locked', () => {
    const { onAcknowledgedChange } = renderNotice({ disabled: true });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    fireEvent.click(checkbox);

    expect(onAcknowledgedChange).not.toHaveBeenCalled();
  });
});

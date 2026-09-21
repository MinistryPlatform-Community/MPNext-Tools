import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiRewritePanel } from './ai-rewrite-panel';
import { analyzeSms } from './sms-utils';

const { mockRewriteTextForSms } = vi.hoisted(() => ({
  mockRewriteTextForSms: vi.fn(),
}));

vi.mock('./actions', () => ({
  rewriteTextForSms: mockRewriteTextForSms,
}));

type Props = React.ComponentProps<typeof AiRewritePanel>;

const DRAFT =
  'Hey [First_Name], just a friendly reminder that our midweek gathering starts at 6:30 PM this Wednesday in the main auditorium.';

function buildProps(overrides: Partial<Props> = {}): Props {
  return {
    body: DRAFT,
    isMms: false,
    currentAnalysis: analyzeSms(DRAFT),
    costPerSegment: 0.0075,
    recipientCount: 300,
    onApply: vi.fn(),
    ...overrides,
  };
}

function renderPanel(overrides: Partial<Props> = {}) {
  const props = buildProps(overrides);
  render(<AiRewritePanel {...props} />);
  return props;
}

function success(text: string, extra: { placeholdersDropped?: string[]; gsmFixed?: boolean } = {}) {
  return {
    success: true as const,
    text,
    placeholdersDropped: extra.placeholdersDropped ?? [],
    gsmFixed: extra.gsmFixed ?? false,
  };
}

beforeEach(() => {
  mockRewriteTextForSms.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AiRewritePanel request', () => {
  it('introduces itself and offers a rewrite', () => {
    renderPanel();

    expect(screen.getByText('AI rewrite')).toBeInTheDocument();
    expect(
      screen.getByText('Suggests a shorter, clearer version that costs fewer segments. You choose whether to use it.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeEnabled();
  });

  it('cannot run on an empty draft', () => {
    renderPanel({ body: '   ', currentAnalysis: analyzeSms('') });
    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeDisabled();
  });

  it('cannot run while the panel is disabled', () => {
    renderPanel({ disabled: true });

    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeDisabled();
    expect(screen.getByPlaceholderText('Optional guidance, e.g. keep the time and the link')).toBeDisabled();
  });

  it('sends the draft with no guidance by default', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Midweek starts 6:30 PM Wed, main auditorium.'));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    await waitFor(() =>
      expect(mockRewriteTextForSms).toHaveBeenCalledWith({ body: DRAFT, guidance: undefined, isMms: false })
    );
  });

  it('passes typed guidance along with the draft', async () => {
    const user = userEvent.setup();
    mockRewriteTextForSms.mockResolvedValue(success('Shorter text.'));
    renderPanel({ isMms: true });

    await user.type(screen.getByPlaceholderText('Optional guidance, e.g. keep the time and the link'), 'keep the time');
    await user.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    await waitFor(() =>
      expect(mockRewriteTextForSms).toHaveBeenCalledWith({ body: DRAFT, guidance: 'keep the time', isMms: true })
    );
  });

  it('locks the controls while the rewrite is in flight', async () => {
    let resolveRewrite!: (value: ReturnType<typeof success>) => void;
    mockRewriteTextForSms.mockReturnValue(
      new Promise((resolve) => {
        resolveRewrite = resolve;
      })
    );
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeDisabled();
    expect(screen.getByPlaceholderText('Optional guidance, e.g. keep the time and the link')).toBeDisabled();

    resolveRewrite(success('Done.'));
    await waitFor(() => expect(screen.getByText('Done.')).toBeInTheDocument());
  });

  it('shows the error when the rewrite fails', async () => {
    mockRewriteTextForSms.mockResolvedValue({ success: false, error: 'AI writing is not configured.' });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(await screen.findByText('AI writing is not configured.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeEnabled();
  });
});

describe('AiRewritePanel suggestion', () => {
  it('compares the suggestion with the draft and shows the saving', async () => {
    const suggestion = 'Hey [First_Name], midweek starts 6:30 PM Wednesday in the auditorium.';
    mockRewriteTextForSms.mockResolvedValue(success(suggestion));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(await screen.findByText(suggestion)).toBeInTheDocument();
    expect(screen.getByText('Characters: 126 to 69 (-57)')).toBeInTheDocument();
    expect(screen.getByText('Segments: 1 to 1 (same)')).toBeInTheDocument();
    expect(screen.getByText('GSM-7')).toBeInTheDocument();
    expect(screen.queryByText(/Saves/)).not.toBeInTheDocument();
    // The trigger becomes a repeat action once a suggestion is on screen.
    expect(screen.getAllByRole('button', { name: /Try again/ })).toHaveLength(2);
  });

  it('prices the saving per recipient and in total when segments drop', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Short and sweet.'));
    renderPanel({ body: 'A'.repeat(200), currentAnalysis: analyzeSms('A'.repeat(200)) });

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(await screen.findByText('Saves $0.01 per recipient, $2.25 total')).toBeInTheDocument();
    expect(screen.getByText('Segments: 2 to 1 (-1)')).toBeInTheDocument();
  });

  it('omits the total when no recipients have resolved yet', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Short and sweet.'));
    renderPanel({ body: 'A'.repeat(200), currentAnalysis: analyzeSms('A'.repeat(200)), recipientCount: 0 });

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(await screen.findByText('Saves $0.01 per recipient')).toBeInTheDocument();
  });

  it('warns when the suggestion costs more and flags the emoji encoding', async () => {
    mockRewriteTextForSms.mockResolvedValue(success(`See you there 🎉 ${'B'.repeat(80)}`));
    renderPanel({ body: 'Short draft', currentAnalysis: analyzeSms('Short draft') });

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(await screen.findByText('Costs $0.01 more per recipient')).toBeInTheDocument();
    expect(screen.getByText('UCS-2')).toBeInTheDocument();
    expect(screen.getByText('Characters: 11 to 96 (+85)')).toBeInTheDocument();
  });

  it('never prices a picture message', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Short and sweet.'));
    renderPanel({ body: 'A'.repeat(200), currentAnalysis: analyzeSms('A'.repeat(200)), isMms: true });

    expect(await screen.findByRole('button', { name: /Suggest a rewrite/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    await screen.findByText('Short and sweet.');
    expect(screen.queryByText(/Saves/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Costs/)).not.toBeInTheDocument();
  });

  it('reports dropped placeholders and character clean-up', async () => {
    mockRewriteTextForSms.mockResolvedValue(
      success('Midweek starts 6:30 PM Wednesday.', { placeholdersDropped: ['First_Name', 'Nickname'], gsmFixed: true })
    );
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    expect(
      await screen.findByText(
        'The rewrite dropped [First_Name], [Nickname]. Add it back if you still want it personalized.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Special characters in the suggestion were replaced with plain ones.')
    ).toBeInTheDocument();
  });

  it('applies the suggestion and clears the panel', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Midweek starts 6:30 PM Wednesday.'));
    const { onApply } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Use this rewrite/ }));

    expect(onApply).toHaveBeenCalledWith('Midweek starts 6:30 PM Wednesday.');
    expect(screen.queryByText('Midweek starts 6:30 PM Wednesday.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeInTheDocument();
  });

  it('dismisses the suggestion without applying it', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Midweek starts 6:30 PM Wednesday.'));
    const { onApply } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Dismiss/ }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByText('Midweek starts 6:30 PM Wednesday.')).not.toBeInTheDocument();
  });

  it('asks again from the suggestion panel', async () => {
    mockRewriteTextForSms.mockResolvedValueOnce(success('First attempt.'));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));
    await screen.findByText('First attempt.');

    mockRewriteTextForSms.mockResolvedValueOnce(success('Second attempt.'));
    fireEvent.click(screen.getAllByRole('button', { name: /Try again/ })[1]);

    expect(await screen.findByText('Second attempt.')).toBeInTheDocument();
    expect(mockRewriteTextForSms).toHaveBeenCalledTimes(2);
  });

  it('keeps the apply and dismiss actions disabled while the form is locked', async () => {
    mockRewriteTextForSms.mockResolvedValue(success('Midweek starts 6:30 PM Wednesday.'));
    const { rerender } = render(<AiRewritePanel {...buildProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));
    await screen.findByText('Midweek starts 6:30 PM Wednesday.');

    rerender(<AiRewritePanel {...buildProps({ disabled: true })} />);

    expect(screen.getByRole('button', { name: /Use this rewrite/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Dismiss/ })).toBeDisabled();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CostSummarySection } from './cost-summary-section';
import { analyzeSms, estimateCompletionSeconds, estimateCost } from './sms-utils';

type Props = React.ComponentProps<typeof CostSummarySection>;

const TIME_ZONE = 'America/Phoenix';
const COST_PER_SEGMENT = 0.0075;
const MMS_COST = 0.02;
const SEGMENTS_PER_SECOND = 5;

/** A 200-character body, so every recipient costs two pieces. */
const TWO_SEGMENT_BODY = 'A'.repeat(200);

function buildProps(overrides: Partial<Props> = {}): Props {
  const analysis = analyzeSms(TWO_SEGMENT_BODY);
  const cost = estimateCost({
    recipients: 300,
    segments: analysis.segments,
    costPerSegment: COST_PER_SEGMENT,
    mmsCostPerMessage: MMS_COST,
    isMms: false,
  });
  return {
    recipients: 300,
    analysis,
    cost,
    isMms: false,
    costPerSegment: COST_PER_SEGMENT,
    mmsCostPerMessage: MMS_COST,
    completionSeconds: estimateCompletionSeconds(cost.totalSegments, SEGMENTS_PER_SECOND),
    segmentsPerSecond: SEGMENTS_PER_SECOND,
    timeZone: TIME_ZONE,
    when: 'now',
    onWhenChange: vi.fn(),
    scheduledLocal: '',
    onScheduledLocalChange: vi.fn(),
    scheduledInstant: null,
    scheduleProblem: null,
    ...overrides,
  };
}

function renderSection(overrides: Partial<Props> = {}) {
  const props = buildProps(overrides);
  render(<CostSummarySection {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CostSummarySection scheduling', () => {
  it('offers both timings and hides the picker when sending right away', () => {
    renderSection();

    expect(screen.getByText('Cost and timing')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Right away' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Schedule for later' })).not.toBeChecked();
    expect(screen.queryByLabelText('Send at')).not.toBeInTheDocument();
  });

  it('switches to scheduling when the other option is picked', () => {
    const { onWhenChange } = renderSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));

    expect(onWhenChange).toHaveBeenCalledWith('later');
  });

  it('shows a datetime picker in church time, floored at the current local wall clock', () => {
    renderSection({ when: 'later', scheduledLocal: '2099-01-02T09:30' });

    const picker = screen.getByLabelText('Send at');
    expect(picker).toHaveAttribute('type', 'datetime-local');
    expect(picker).toHaveValue('2099-01-02T09:30');
    expect(picker.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(screen.getByText('MST')).toBeInTheDocument();
  });

  it('explains the church time zone behind the hint', () => {
    renderSection({ when: 'later', scheduledLocal: '2099-01-02T09:30' });

    fireEvent.click(screen.getByRole('button', { name: 'About the time zone' }));

    expect(
      screen.getByText(
        /Times are in the church's time zone \(America\/Phoenix\), which is what Ministry Platform uses to schedule sends, even if you are somewhere else\./
      )
    ).toBeInTheDocument();
  });

  it('reports a new picker value', () => {
    const { onScheduledLocalChange } = renderSection({ when: 'later', scheduledLocal: '2099-01-02T09:30' });

    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2099-01-03T18:15' } });

    expect(onScheduledLocalChange).toHaveBeenCalledWith('2099-01-03T18:15');
  });

  it('shows the reason a chosen time is rejected', () => {
    renderSection({
      when: 'later',
      scheduledLocal: '2020-01-01T09:00',
      scheduleProblem: 'Pick a time in the future.',
    });

    expect(screen.getByText('Pick a time in the future.')).toBeInTheDocument();
  });

  it('disables the timing controls when the form is locked', () => {
    renderSection({ when: 'later', scheduledLocal: '2099-01-02T09:30', disabled: true });

    expect(screen.getByLabelText('Send at')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Right away' })).toBeDisabled();
  });
});

describe('CostSummarySection estimates', () => {
  it('shows the total cost and delivery time for an immediate send', () => {
    renderSection();

    // 300 recipients x 2 pieces x $0.0075
    expect(screen.getByText('$4.50')).toBeInTheDocument();
    expect(screen.getByText('for 300 people')).toBeInTheDocument();
    expect(screen.getByText('2 minutes')).toBeInTheDocument();
    expect(screen.getByText('from the moment it is released')).toBeInTheDocument();
  });

  it('uses the singular noun for a single recipient', () => {
    const analysis = analyzeSms('Short one');
    renderSection({
      recipients: 1,
      analysis,
      cost: estimateCost({
        recipients: 1,
        segments: analysis.segments,
        costPerSegment: COST_PER_SEGMENT,
        mmsCostPerMessage: MMS_COST,
        isMms: false,
      }),
      completionSeconds: estimateCompletionSeconds(1, SEGMENTS_PER_SECOND),
    });

    expect(screen.getByText('for 1 person')).toBeInTheDocument();
  });

  it('prompts for recipients and a message before anything can be estimated', () => {
    const analysis = analyzeSms('');
    renderSection({
      recipients: 0,
      analysis,
      cost: estimateCost({
        recipients: 0,
        segments: analysis.segments,
        costPerSegment: COST_PER_SEGMENT,
        mmsCostPerMessage: MMS_COST,
        isMms: false,
      }),
      completionSeconds: 0,
    });

    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('n/a')).toBeInTheDocument();
    expect(screen.getAllByText('Add recipients and a message')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'How delivery time is estimated' })).not.toBeInTheDocument();
  });

  it('estimates when a scheduled send starts and finishes on the same day', () => {
    // 2099-01-02 09:30 in Phoenix (UTC-7, no DST).
    const start = new Date('2099-01-02T16:30:00.000Z');
    renderSection({ when: 'later', scheduledLocal: '2099-01-02T09:30', scheduledInstant: start });

    expect(screen.getByText('Starts Fri, Jan 2 at 9:30 AM, done around 9:32 AM')).toBeInTheDocument();
  });

  it('includes the date in the finish estimate when the send runs past midnight', () => {
    const start = new Date('2099-01-03T06:50:00.000Z'); // 2099-01-02 23:50 in Phoenix
    renderSection({
      when: 'later',
      scheduledLocal: '2099-01-02T23:50',
      scheduledInstant: start,
      completionSeconds: 1800,
    });

    expect(screen.getByText('Starts Fri, Jan 2 at 11:50 PM, done around Sat, Jan 3 at 12:20 AM')).toBeInTheDocument();
  });

  it('asks for a date before it can estimate the finish', () => {
    renderSection({ when: 'later', scheduledLocal: '' });

    expect(screen.getByText('Pick a date and time to see when it finishes')).toBeInTheDocument();
  });

  it('explains the throughput behind the delivery-time hint for a text', () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'How delivery time is estimated' }));

    expect(
      screen.getByText(
        /Messages go out at about 5 per second\. This send is 600 text pieces in total \(300 people x 2 per person\)\./
      )
    ).toBeInTheDocument();
  });

  it('counts picture messages instead of pieces in the hint', () => {
    const analysis = analyzeSms('Look at this');
    renderSection({
      isMms: true,
      recipients: 1,
      analysis,
      cost: estimateCost({
        recipients: 1,
        segments: analysis.segments,
        costPerSegment: COST_PER_SEGMENT,
        mmsCostPerMessage: MMS_COST,
        isMms: true,
      }),
      completionSeconds: estimateCompletionSeconds(1, SEGMENTS_PER_SECOND),
    });

    fireEvent.click(screen.getByRole('button', { name: 'How delivery time is estimated' }));

    expect(
      screen.getByText(/Messages go out at about 5 per second\. This send is 1 picture message in total\./)
    ).toBeInTheDocument();
  });
});

describe('CostSummarySection details disclosure', () => {
  it('opens and closes the per-recipient breakdown', () => {
    renderSection();

    const toggle = screen.getByRole('button', { name: 'Show details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Cost per person')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    const hide = screen.getByRole('button', { name: 'Hide details' });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Recipients')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('Text (SMS, GSM-7)')).toBeInTheDocument();
    expect(screen.getByText('Pieces per person')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$0.01 per piece')).toBeInTheDocument();
    expect(screen.getByText('Cost per person')).toBeInTheDocument();
    expect(screen.getByText('$0.02')).toBeInTheDocument();
    expect(screen.getByText('Total pieces')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
    expect(screen.getByText('5 per second')).toBeInTheDocument();

    fireEvent.click(hide);
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument();
    expect(screen.queryByText('Cost per person')).not.toBeInTheDocument();
  });

  it('shows the picture-message rate and per-message billing in the breakdown', () => {
    const analysis = analyzeSms('Look at this');
    renderSection({
      isMms: true,
      recipients: 300,
      analysis,
      cost: estimateCost({
        recipients: 300,
        segments: analysis.segments,
        costPerSegment: COST_PER_SEGMENT,
        mmsCostPerMessage: MMS_COST,
        isMms: true,
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));

    expect(screen.getByText('Picture message (MMS)')).toBeInTheDocument();
    expect(screen.getByText('Billed per person')).toBeInTheDocument();
    expect(screen.getByText('1 message')).toBeInTheDocument();
    expect(screen.getByText('$0.02 per message')).toBeInTheDocument();
  });
});

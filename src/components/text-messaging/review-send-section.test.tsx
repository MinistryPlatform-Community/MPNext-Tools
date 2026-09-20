import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { TextQuota } from '@/lib/dto';
import { ReviewSendSection } from './review-send-section';

type Props = React.ComponentProps<typeof ReviewSendSection>;

const quotaWithLimit: TextQuota = { limit: 500, roleNames: ['Communications'] };
const quotaNone: TextQuota = { limit: null, roleNames: [] };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderSection(overrides: Partial<Props> = {}) {
  const props: Props = {
    recipientCount: 25,
    fromLabel: 'Dream City Church',
    totalCost: 1.25,
    isMms: false,
    whenLabel: 'Right away',
    scheduled: false,
    quota: quotaWithLimit,
    needsReview: false,
    approvalProcessConfigured: true,
    blockedReason: null,
    sending: false,
    progress: null,
    completedMessage: null,
    sendError: null,
    onSend: vi.fn(),
    onRetryFailed: vi.fn(),
    onNewMessage: vi.fn(),
    ...overrides,
  };
  render(<ReviewSendSection {...props} />);
  return props;
}

/** Opens the confirm dialog and returns it. */
function openConfirm(name: RegExp | string) {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('alertdialog');
}

describe('ReviewSendSection summary', () => {
  it('lists recipients, sender, timing, and cost', () => {
    renderSection();

    expect(screen.getByText('Review and send')).toBeInTheDocument();
    expect(screen.getByText('25 people')).toBeInTheDocument();
    expect(screen.getByText('Dream City Church')).toBeInTheDocument();
    expect(screen.getByText('Right away')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
  });

  it('uses the singular noun for one recipient', () => {
    renderSection({ recipientCount: 1 });
    expect(screen.getByText('1 person')).toBeInTheDocument();
  });

  it('says there are no recipients yet when the count is zero', () => {
    renderSection({ recipientCount: 0 });
    expect(screen.getByText('No recipients yet')).toBeInTheDocument();
  });

  it('prompts for a number when no sender has been chosen and marks a picture message', () => {
    renderSection({ fromLabel: '', isMms: true, totalCost: 10 });

    expect(screen.getByText('Choose a number')).toBeInTheDocument();
    expect(screen.getByText('$10.00 (picture message)')).toBeInTheDocument();
  });
});

describe('ReviewSendSection button label', () => {
  it('reads "Send text" for an immediate send within quota', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Send text' })).toBeEnabled();
  });

  it('reads "Schedule text" for a scheduled send within quota', () => {
    renderSection({ scheduled: true, whenLabel: 'Thu, Sep 24 at 9:00 AM' });
    expect(screen.getByRole('button', { name: 'Schedule text' })).toBeInTheDocument();
  });

  it('reads "Submit for approval" when the send needs review and the church has a process', () => {
    renderSection({ needsReview: true });
    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeInTheDocument();
  });

  it('falls back to "Send text" when review is needed but no approval process exists', () => {
    renderSection({ needsReview: true, approvalProcessConfigured: false, blockedReason: 'Too many recipients' });
    expect(screen.getByRole('button', { name: 'Send text' })).toBeDisabled();
  });

  it('falls back to "Schedule text" for a blocked scheduled send with no approval process', () => {
    renderSection({
      needsReview: true,
      approvalProcessConfigured: false,
      scheduled: true,
      blockedReason: 'Too many recipients',
    });
    expect(screen.getByRole('button', { name: 'Schedule text' })).toBeDisabled();
  });
});

describe('ReviewSendSection approval copy', () => {
  it('blocks a no-quota sender when the church has no approval process', () => {
    renderSection({ quota: quotaNone, needsReview: true, approvalProcessConfigured: false });

    expect(
      screen.getByText(
        'This text cannot be sent: your account has no pre-approved texting limit and this church has not set up a message approval process.'
      )
    ).toBeInTheDocument();
  });

  it('blocks an over-quota send when the church has no approval process', () => {
    renderSection({
      quota: { limit: 50, roleNames: ['Communications', 'Staff'] },
      recipientCount: 1200,
      needsReview: true,
      approvalProcessConfigured: false,
    });

    expect(
      screen.getByText(
        'This text cannot be sent: 1,200 people is over your limit of 50, and this church has not set up a message approval process. Reduce the recipients to 50 or fewer.'
      )
    ).toBeInTheDocument();
  });

  it('explains the blocked state with the contributing roles behind the hint', () => {
    renderSection({
      quota: { limit: 50, roleNames: ['Communications', 'Staff'] },
      recipientCount: 1200,
      needsReview: true,
      approvalProcessConfigured: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));

    expect(
      screen.getByText(
        'Your pre-approved texting limit (from Communications, Staff) is the number of people you can text without approval. Because this church has no message approval process set up, texts over that limit cannot be sent. Send to fewer people, or ask an administrator to set up an approval process.'
      )
    ).toBeInTheDocument();
  });

  it('omits the role list from the blocked hint when no role grants a quota', () => {
    renderSection({ quota: quotaNone, needsReview: true, approvalProcessConfigured: false });

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));

    expect(
      screen.getByText(
        'Your pre-approved texting limit is the number of people you can text without approval. Because this church has no message approval process set up, texts over that limit cannot be sent. Send to fewer people, or ask an administrator to set up an approval process.'
      )
    ).toBeInTheDocument();
  });

  it('warns that an approver reviews the message when the sender has no quota at all', () => {
    renderSection({ quota: quotaNone, needsReview: true });

    expect(screen.getByText('An approver will review this message before it sends.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));
    expect(
      screen.getByText(
        'None of your security roles has a pre-approved texting limit (Mass Text Quota), so every text you send is placed in review until an approver releases it.'
      )
    ).toBeInTheDocument();
  });

  it('names the limit that was exceeded when the send goes to review', () => {
    renderSection({ quota: { limit: 500, roleNames: ['Communications'] }, recipientCount: 2500, needsReview: true });

    expect(
      screen.getByText('An approver will review this message before it sends: 2,500 people is over your limit of 500.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));
    expect(
      screen.getByText(
        'Your pre-approved texting limit comes from your security role (Communications). Sends within it go out on their own; larger sends wait for an approver.'
      )
    ).toBeInTheDocument();
  });

  it('confirms no approval is needed inside the quota and pluralizes several roles', () => {
    renderSection({ quota: { limit: 500, roleNames: ['Communications', 'Staff'] } });

    expect(screen.getByText('No approval needed: within your limit of 500 people.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));
    expect(
      screen.getByText(
        'Your pre-approved texting limit comes from your security roles (Communications, Staff). Sends within it go out on their own; larger sends wait for an approver.'
      )
    ).toBeInTheDocument();
  });

  it('drops the parenthetical from the hint when the quota has no named roles', () => {
    renderSection({ quota: { limit: 500, roleNames: [] } });

    fireEvent.click(screen.getByRole('button', { name: 'About approval limits' }));
    expect(
      screen.getByText(
        'Your pre-approved texting limit comes from your security roles. Sends within it go out on their own; larger sends wait for an approver.'
      )
    ).toBeInTheDocument();
  });
});

describe('ReviewSendSection sending states', () => {
  it('shows the progress counts and bar while the send runs', () => {
    renderSection({
      sending: true,
      progress: { sentRows: 400, totalRows: 1000, skippedRows: 3, failedRecipients: 0 },
    });

    expect(screen.getByText(/Preparing messages\.\.\. 400 of 1,000/)).toBeInTheDocument();
    const bar = document.querySelector('.bg-cyan-600') as HTMLElement;
    expect(bar).toHaveStyle({ width: '40%' });
  });

  it('keeps the bar empty when no rows have been counted yet', () => {
    renderSection({
      sending: true,
      progress: { sentRows: 0, totalRows: 0, skippedRows: 0, failedRecipients: 0 },
    });

    const bar = document.querySelector('.bg-cyan-600') as HTMLElement;
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('disables the send button and hides the blocked note while sending', () => {
    renderSection({
      sending: true,
      blockedReason: 'Pick a number first',
      progress: { sentRows: 1, totalRows: 2, skippedRows: 0, failedRecipients: 0 },
    });

    expect(screen.getByRole('button', { name: 'Send text' })).toBeDisabled();
    expect(screen.queryByText('Pick a number first')).not.toBeInTheDocument();
  });

  it('shows the blocked reason next to a disabled button when not sending', () => {
    renderSection({ blockedReason: 'Pick a number first' });

    expect(screen.getByRole('button', { name: 'Send text' })).toBeDisabled();
    expect(screen.getByText('Pick a number first')).toBeInTheDocument();
  });

  it('shows the send error', () => {
    renderSection({ sendError: 'Chunk 3 failed: MP returned 500' });
    expect(screen.getByText('Chunk 3 failed: MP returned 500')).toBeInTheDocument();
  });

  it('offers a retry for failed recipients once the send has stopped', () => {
    const { onRetryFailed } = renderSection({
      progress: { sentRows: 900, totalRows: 1000, skippedRows: 0, failedRecipients: 100 },
      sendError: 'A chunk failed',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry 100 failed' }));
    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('hides the retry button when nothing failed', () => {
    renderSection({ progress: { sentRows: 1000, totalRows: 1000, skippedRows: 0, failedRecipients: 0 } });
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
  });

  it('shows the completion message and starts a new message', () => {
    const { onNewMessage } = renderSection({
      completedMessage: 'Sent to 25 people. The platform is delivering them now.',
      progress: { sentRows: 25, totalRows: 25, skippedRows: 0, failedRecipients: 0 },
    });

    expect(screen.getByText('Sent to 25 people. The platform is delivering them now.')).toBeInTheDocument();
    expect(screen.getByText('Starts a fresh text. This one is already on its way.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send text' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New message' }));
    expect(onNewMessage).toHaveBeenCalledTimes(1);
  });
});

describe('ReviewSendSection confirm dialog', () => {
  it('asks to confirm an immediate send and calls onSend', () => {
    const { onSend } = renderSection();

    const dialog = openConfirm('Send text');
    expect(within(dialog).getByText('Send to 25 people?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /One text per person from Dream City Church, at an estimated cost of \$1\.25\. Sending starts right away\. Messages cannot be recalled once the platform sends them\./
      )
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Send text' }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes without sending when cancelled', () => {
    const { onSend } = renderSection();

    const dialog = openConfirm('Send text');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('describes a scheduled picture message to one person', () => {
    renderSection({
      recipientCount: 1,
      scheduled: true,
      isMms: true,
      whenLabel: 'Thu, Sep 24 at 9:00 AM',
      totalCost: 0.02,
    });

    const dialog = openConfirm('Schedule text');
    expect(within(dialog).getByText('Schedule to 1 person?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /One picture message per person from Dream City Church, at an estimated cost of \$0\.02\. Sending starts Thu, Sep 24 at 9:00 AM\./
      )
    ).toBeInTheDocument();
  });

  it('describes a submission for approval', () => {
    renderSection({ needsReview: true, recipientCount: 2500 });

    const dialog = openConfirm('Submit for approval');
    expect(within(dialog).getByText('Submit to 2,500 people?')).toBeInTheDocument();
    expect(within(dialog).getByText(/An approver reviews it first and releases it\./)).toBeInTheDocument();
  });

  it('repeats the curfew and collision warnings in the dialog', () => {
    renderSection({
      curfewWarning: 'It would send during quiet hours (7:00 PM to 8:00 AM).',
      collisionWarning: '2 other large messages land within 2 hours of this text.',
    });

    const dialog = openConfirm('Send text');
    expect(
      within(dialog).getByText(
        /It would send during quiet hours \(7:00 PM to 8:00 AM\)\. Heads up: 2 other large messages land within 2 hours of this text\./
      )
    ).toBeInTheDocument();
  });
});

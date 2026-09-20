import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MessagingCollisionPanel } from './messaging-collision-panel';
import type { MessagingCollision, MessagingCollisionResult } from '@/lib/dto';

afterEach(() => {
  cleanup();
});

function collision(overrides: Partial<MessagingCollision> = {}): MessagingCollision {
  return {
    communicationId: 1,
    subject: 'Sunday reminder',
    channel: 'email',
    channelLabel: 'Email',
    statusLabel: 'Ready to Send',
    isPending: true,
    startAt: '2026-09-17T16:00:00.000Z',
    hoursFromSendAt: -2,
    authorName: null,
    fromLabel: null,
    recipientCount: 2500,
    isLarge: true,
    isHighImpact: false,
    isCritical: true,
    estimatedSegments: null,
    estimatedDeliveryMinutes: 8,
    queueDelayMinutes: null,
    interferes: false,
    overlapCount: null,
    ...overrides,
  };
}

function result(overrides: Partial<MessagingCollisionResult> = {}): MessagingCollisionResult {
  return {
    sendAt: '2026-09-17T18:00:00.000Z',
    windowStart: '2026-09-17T06:00:00.000Z',
    windowEnd: '2026-09-18T06:00:00.000Z',
    lookbackHours: 12,
    lookaheadHours: 12,
    largeSendThreshold: 1000,
    highImpactThreshold: 10000,
    criticalHours: 2,
    segmentsPerSecond: 5,
    emailsPerSecond: 5,
    plannedDeliveryMinutes: null,
    plannedQueueDelayMinutes: null,
    plannedIsLarge: false,
    collisions: [],
    truncatedCount: 0,
    overlapChecked: false,
    ...overrides,
  };
}

const zone = 'America/Phoenix';

describe('MessagingCollisionPanel', () => {
  it('renders nothing before a check has started', () => {
    const { container } = render(<MessagingCollisionPanel result={null} loading={false} error={null} timeZone={zone} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a checking state while the first check runs', () => {
    render(<MessagingCollisionPanel result={null} loading error={null} timeZone={zone} />);
    expect(screen.getByText('Other messages around this time')).toBeInTheDocument();
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('shows the error when the check failed', () => {
    render(<MessagingCollisionPanel result={null} loading={false} error="MP is unavailable" timeZone={zone} />);
    expect(screen.getByText('Could not check: MP is unavailable')).toBeInTheDocument();
  });

  it('reports a clear window with no groups', () => {
    render(<MessagingCollisionPanel result={result()} loading={false} error={null} timeZone={zone} sendNoun="text" />);
    expect(screen.getByText(/No other large messages within/)).toBeInTheDocument();
    expect(screen.queryByText('Before this text')).not.toBeInTheDocument();
    expect(screen.queryByText('After this text')).not.toBeInTheDocument();
    expect(screen.getByText(/Window: .* either side\. Large: more than 1,000 people\./)).toBeInTheDocument();
  });

  it('splits collisions into before and after groups with channel, count, overlap, and badges', () => {
    const before = collision({ communicationId: 1, subject: 'Sunday reminder', hoursFromSendAt: -2, overlapCount: 120 });
    const after = collision({
      communicationId: 2,
      subject: '',
      channel: 'sms',
      channelLabel: 'Text',
      hoursFromSendAt: 1.5,
      recipientCount: 12000,
      isHighImpact: true,
      interferes: true,
      queueDelayMinutes: 6,
      overlapCount: 3,
    });
    render(
      <MessagingCollisionPanel
        result={result({ collisions: [before, after], overlapChecked: true, truncatedCount: 4 })}
        loading={false}
        error={null}
        timeZone={zone}
        sendNoun="text"
      />
    );
    expect(screen.getByText('Before this text')).toBeInTheDocument();
    expect(screen.getByText('After this text')).toBeInTheDocument();
    expect(screen.getByText('Sunday reminder')).toBeInTheDocument();
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
    expect(screen.getByText('High impact')).toBeInTheDocument();
    expect(screen.getByText('2,500 people')).toBeInTheDocument();
    expect(screen.getByText('12,000 people')).toBeInTheDocument();
    expect(screen.getByText(/120 also on this text/)).toBeInTheDocument();
    expect(screen.getByText(/3 also on this text/)).toBeInTheDocument();
    expect(screen.getByText('And 4 more.')).toBeInTheDocument();
    expect(screen.getAllByText(/^(Email|Text)$/)).toHaveLength(2);
  });

  it('omits overlap text when overlap was not checked and dims the summary while refreshing', () => {
    render(
      <MessagingCollisionPanel
        result={result({ collisions: [collision({ overlapCount: 50 })], overlapChecked: false })}
        loading
        error={null}
        timeZone={zone}
      />
    );
    expect(screen.queryByText(/also on this/)).not.toBeInTheDocument();
    expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
    expect(screen.getByText(/Before this message/)).toBeInTheDocument();
  });
});

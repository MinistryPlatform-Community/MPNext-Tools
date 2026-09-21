/**
 * DTOs for the messaging collision check.
 *
 * A "collision" is another `dp_Communications` row (email or text) whose `Start_Date`
 * falls within a few hours of a planned send. Two kinds are reported:
 *  - large sends (more recipients than the threshold) near the planned time, whether
 *    already sent or still scheduled;
 *  - when the planned send is itself large, every message still waiting to go out
 *    near the planned time, whatever its size.
 *
 * The check is tool-agnostic: any tool that writes communications can call it with a
 * recipient count, an optional planned instant, and optional recipient Contact_IDs.
 */

export type MessagingChannel = 'email' | 'sms' | 'other';

export interface MessagingCollisionInput {
  /** Recipients the planned send will reach after exclusions. */
  recipientCount: number;
  /**
   * Planned send instant as an ISO 8601 string with offset or `Z`. Omitted means
   * "as soon as it is released", i.e. now.
   */
  sendAt?: string;
  /**
   * Contact_IDs of the planned recipients. When supplied, each collision reports how
   * many of them also received (or will receive) that message.
   */
  recipientContactIds?: number[];
  /** A communication to ignore, e.g. the draft being edited. */
  excludeCommunicationId?: number;
  /** Channels to consider; defaults to email and sms. */
  channels?: MessagingChannel[];
  /**
   * Channel of the planned send. With `sms` or `email` the server simulates MP's single
   * serial messaging worker over every nearby email and text in scheduled order, so
   * small sends that would still hold this one up are reported with an estimated delay.
   * Omitted means no queue modelling.
   */
  plannedChannel?: MessagingChannel;
  /** Segments per recipient of the planned text (1 when omitted). */
  plannedSegments?: number;
}

/** One other communication near the planned send time. */
export interface MessagingCollision {
  communicationId: number;
  subject: string;
  channel: MessagingChannel;
  /** `dp_Communication_Types.Communication_Type`, e.g. "Email", "SMS Text". */
  channelLabel: string;
  /** `dp_Communication_Statuses.Status`, e.g. "Sent", "Ready to Send", "In Review". */
  statusLabel: string;
  /** True when the platform has not sent it yet (scheduled, awaiting approval, or a future draft). */
  isPending: boolean;
  /** `Start_Date` as an ISO 8601 instant (UTC). */
  startAt: string;
  /** Signed hours from the planned send time; negative means before it. */
  hoursFromSendAt: number;
  authorName: string | null;
  /** The sending SMS number's title for texts; null for email. */
  fromLabel: string | null;
  /** Non-deleted `dp_Communication_Messages` rows on the communication. */
  recipientCount: number;
  /** True when `recipientCount` is over the large-send threshold. */
  isLarge: boolean;
  /** True when `recipientCount` is over the high-impact threshold (10,000 by default). */
  isHighImpact: boolean;
  /** True when it starts within the critical band (2 hours by default) of the planned send. */
  isCritical: boolean;
  /** Estimated segments per recipient from the stored body; texts only, null otherwise. */
  estimatedSegments: number | null;
  /**
   * Estimated minutes the worker needs to deliver it: recipients x segments at the
   * text rate, or recipients at the email rate. Null when the queue was not modelled.
   */
  estimatedDeliveryMinutes: number | null;
  /**
   * Estimated minutes of queueing between it and the planned send, from a simulation of
   * the serial worker over every nearby message: for an earlier message, how long it is
   * still being processed after the planned start; for a later one, how much later it
   * starts because the planned send is in front of it. Null when the queue was not
   * modelled, or for a Sent email (the worker is done with it; Sent texts stay in because
   * the carrier may still be delivering them).
   */
  queueDelayMinutes: number | null;
  /** True when `queueDelayMinutes` is at least a minute, i.e. the two sends would wait on each other. */
  interferes: boolean;
  /**
   * Planned recipients who are also on this communication. Null when the caller sent
   * no recipient IDs or the overlap read budget ran out.
   */
  overlapCount: number | null;
}

export interface MessagingCollisionResult {
  /** The planned send instant the window was built around (ISO 8601, UTC). */
  sendAt: string;
  windowStart: string;
  windowEnd: string;
  lookbackHours: number;
  lookaheadHours: number;
  /** Recipient count above which a send is "large". */
  largeSendThreshold: number;
  /** Recipient count above which a send is "high impact". */
  highImpactThreshold: number;
  /** Hours either side of the planned send treated as the queueing band. */
  criticalHours: number;
  /** Text delivery throughput the estimates assume (segments per second). */
  segmentsPerSecond: number;
  /** Email delivery throughput the estimates assume (messages per second). */
  emailsPerSecond: number;
  /** Estimated minutes to deliver the planned send; null when the queue was not modelled. */
  plannedDeliveryMinutes: number | null;
  /**
   * Estimated minutes the planned send starts late because earlier messages are still
   * being processed. Null when the queue was not modelled.
   */
  plannedQueueDelayMinutes: number | null;
  /** True when the planned send is over the threshold, so pending sends were also checked. */
  plannedIsLarge: boolean;
  /**
   * Large sends in the window plus, when the queue is modelled, smaller texts that
   * would interfere. Ordered by start time; when capped, the nearest are kept.
   */
  collisions: MessagingCollision[];
  /** Collisions beyond the cap that were found but not returned. */
  truncatedCount: number;
  /** True when overlap counts were attempted (recipient IDs were supplied). */
  overlapChecked: boolean;
}

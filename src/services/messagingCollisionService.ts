import { MPHelper } from '@/lib/providers/ministry-platform';
import {
  MESSAGING_COLLISION_MAX_OVERLAP_READS,
  MESSAGING_COLLISION_MAX_RESULTS,
  MP_FETCH_BATCH_SIZE,
  MP_MAX_PAGE_SIZE,
  TEXT_COMMUNICATION_STATUS_DRAFT_ID,
  TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID,
  TEXT_COMMUNICATION_STATUS_READY_ID,
  TEXT_COMMUNICATION_STATUS_SENT_ID,
} from '@/lib/constants';
import { validatePositiveInt } from '@/lib/validation';
import { AuthorizationService } from '@/services/authorizationService';
import { DomainTimezoneService } from '@/services/domainTimezoneService';
import { getMessagingSettings } from '@/services/messagingSettings';
import { analyzeSms } from '@/components/text-messaging/sms-utils';
import type { MessagingChannel, MessagingCollision, MessagingCollisionResult } from '@/lib/dto';

const HOUR_MS = 60 * 60 * 1000;
const MP_SQL_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/**
 * Everything `findCollisions` needs. Every threshold, window, and rate defaults to the
 * church's `dp_Configuration_Settings` (Application_Code MPNEXT), then the environment,
 * then `src/lib/constants.ts`; pass a value only to override that for one call.
 */
export interface CollisionSearchOptions {
  /** The instant the planned send starts. */
  sendAt: Date;
  /** Recipients the planned send reaches. */
  recipientCount: number;
  /** Planned recipients' Contact_IDs; enables per-collision overlap counts. */
  recipientContactIds?: number[];
  /** A communication to leave out, e.g. the draft being edited. */
  excludeCommunicationId?: number;
  /** Channels to report; defaults to email and sms. */
  channels?: MessagingChannel[];
  /** Channel of the planned send; 'sms' or 'email' turns on the serial-queue simulation. */
  plannedChannel?: MessagingChannel;
  /** Segments per recipient of the planned text (1 when omitted; ignored for email). */
  plannedSegments?: number;
  /** Text throughput for the estimates, segments per second. */
  segmentsPerSecond?: number;
  /** Email throughput for the estimates, messages per second. */
  emailsPerSecond?: number;
  lookbackHours?: number;
  lookaheadHours?: number;
  /** A communication with more recipients than this is "large". */
  largeSendThreshold?: number;
  /** A communication with more recipients than this is "high impact". */
  highImpactThreshold?: number;
  /** Hours either side of the planned send flagged as the queueing band. */
  criticalHours?: number;
  maxResults?: number;
  /** Read budget for overlap counting; see `MESSAGING_COLLISION_MAX_OVERLAP_READS`. */
  maxOverlapReads?: number;
}

/** `dp_Communication_Messages` grouped by communication. */
export interface RecipientCountRow {
  Communication_ID: number;
  Recipient_Count: number;
}

/** `dp_Communications` columns the collision list shows. */
export interface CommunicationDetailRow {
  Communication_ID: number;
  Subject: string | null;
  /** MP wall-clock datetime, e.g. "2026-09-17T12:23:52.383". */
  Start_Date: string;
  Communication_Type_ID: number | null;
  Communication_Type: string | null;
  Communication_Status_ID: number | null;
  Status: string | null;
  Author_Name: string | null;
  From_Number: string | null;
}

/**
 * Statuses that will go out without further editing: In Review and Ready to Send.
 * Drafts are excluded everywhere; nobody has committed to sending them.
 */
const PENDING_STATUS_IDS = [TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID, TEXT_COMMUNICATION_STATUS_READY_ID];

/** Minimum estimated queueing, in minutes, before two sends count as interfering. */
const INTERFERENCE_MINUTES = 1;

export interface QueuedMessage {
  id: number;
  /** Scheduled start instant. */
  startMs: number;
  /** Estimated minutes the worker spends on it. */
  durationMinutes: number;
}

export interface SerialQueueEstimate {
  /** Minutes the planned send starts late because earlier messages are still processing. */
  plannedDelayMinutes: number;
  /**
   * Per message: for one scheduled before or with the planned send, how long it is still
   * processing after the planned start; for one scheduled after, how much later it starts
   * because the planned send is in front of it (its own delay from other messages is not counted).
   */
  delays: Map<number, number>;
}

/**
 * Simulates MP's messaging worker: one serial queue shared by email and text, taking
 * messages in scheduled order, each starting when scheduled or when the previous one
 * finishes, whichever is later. The planned send is slotted after every message
 * scheduled at or before its time. Run twice, with and without the planned send, so a
 * later message's delay is only the part the planned send causes.
 */
export function simulateSerialQueue(input: {
  sendAtMs: number;
  plannedDurationMinutes: number;
  others: QueuedMessage[];
}): SerialQueueEstimate {
  const minute = 60_000;
  const others = [...input.others].sort((a, b) => a.startMs - b.startMs || a.id - b.id);
  const toMinutes = (ms: number) => Math.max(0, Math.round(ms / minute));

  // Without the planned send: when each message would start on its own.
  const startWithout = new Map<number, number>();
  let cursor = Number.NEGATIVE_INFINITY;
  for (const m of others) {
    const start = Math.max(m.startMs, cursor);
    startWithout.set(m.id, start);
    cursor = start + m.durationMinutes * minute;
  }

  // With the planned send in its slot.
  const delays = new Map<number, number>();
  cursor = Number.NEGATIVE_INFINITY;
  let plannedStart: number | null = null;
  for (const m of others) {
    if (plannedStart === null && m.startMs > input.sendAtMs) {
      plannedStart = Math.max(input.sendAtMs, cursor);
      cursor = plannedStart + input.plannedDurationMinutes * minute;
    }
    const start = Math.max(m.startMs, cursor);
    const end = start + m.durationMinutes * minute;
    if (plannedStart === null) {
      // Ahead of the planned send: what it still has to process after the planned start.
      delays.set(m.id, toMinutes(end - input.sendAtMs));
    } else {
      delays.set(m.id, toMinutes(start - (startWithout.get(m.id) ?? m.startMs)));
    }
    cursor = end;
  }
  if (plannedStart === null) plannedStart = Math.max(input.sendAtMs, cursor);

  return { plannedDelayMinutes: toMinutes(plannedStart - input.sendAtMs), delays };
}

/** Maps `dp_Communication_Types.Communication_Type` to a channel. */
export function channelForType(typeName: string | null | undefined): MessagingChannel {
  const name = (typeName ?? '').toLowerCase();
  if (name.includes('email')) return 'email';
  if (name.includes('text') || name.includes('sms')) return 'sms';
  return 'other';
}

/**
 * MessagingCollisionService: singleton that finds other communications (email or
 * text) starting within a few hours of a planned send, so a sender can see when two
 * large messages would land on the same people at the same time.
 *
 * Reads only. Recipient counts come from `dp_Communication_Messages` grouped by
 * communication (`$groupby` + `$having`), which the MP table API answers in one call
 * per window instead of one per communication.
 */
export class MessagingCollisionService {
  private static instance: MessagingCollisionService;
  private mp: MPHelper | null = null;

  private constructor() {
    // Initialization is handled by getInstance()
  }

  public static async getInstance(): Promise<MessagingCollisionService> {
    if (!MessagingCollisionService.instance) {
      MessagingCollisionService.instance = new MessagingCollisionService();
      await MessagingCollisionService.instance.initialize();
    }
    return MessagingCollisionService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  private inList(ids: number[]): string {
    return ids.map((id) => validatePositiveInt(Math.trunc(id))).join(',');
  }

  private assertSqlDatetime(value: string, name: string): string {
    if (!MP_SQL_DATETIME.test(value)) throw new Error(`${name} must be an MP SQL datetime`);
    return value;
  }

  // =====================================================================
  // Reads
  // =====================================================================

  /**
   * Communications starting in the window with more than `threshold` non-deleted
   * message rows, as `Communication_ID` to recipient count. Templates and Drafts are
   * skipped.
   */
  public async findLargeCommunications(
    windowStartSql: string,
    windowEndSql: string,
    threshold: number,
    excludeCommunicationId?: number
  ): Promise<Map<number, number>> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
    const start = this.assertSqlDatetime(windowStartSql, 'windowStart');
    const end = this.assertSqlDatetime(windowEndSql, 'windowEnd');
    const minCount = validatePositiveInt(Math.trunc(threshold));
    const exclude = excludeCommunicationId
      ? ` AND dp_Communication_Messages.Communication_ID <> ${validatePositiveInt(Math.trunc(excludeCommunicationId))}`
      : '';
    const rows = await this.mp!.getTableRecords<RecipientCountRow>({
      table: 'dp_Communication_Messages',
      select: 'dp_Communication_Messages.Communication_ID, COUNT(*) AS Recipient_Count',
      filter:
        `Communication_ID_TABLE.Start_Date >= '${start}' AND Communication_ID_TABLE.Start_Date <= '${end}'` +
        ` AND Communication_ID_TABLE.Template = 0` +
        ` AND Communication_ID_TABLE.Communication_Status_ID <> ${validatePositiveInt(TEXT_COMMUNICATION_STATUS_DRAFT_ID)}` +
        ` AND dp_Communication_Messages.Deleted = 0${exclude}`,
      groupBy: 'dp_Communication_Messages.Communication_ID',
      having: `COUNT(*) > ${minCount}`,
      orderBy: 'dp_Communication_Messages.Communication_ID',
      top: MP_MAX_PAGE_SIZE,
    });
    return this.toCountMap(rows);
  }

  /**
   * IDs of communications starting in the window that are committed but not yet sent:
   * In Review or Ready to Send. Templates and Drafts are skipped.
   */
  public async findPendingCommunicationIds(
    windowStartSql: string,
    windowEndSql: string,
    excludeCommunicationId?: number
  ): Promise<number[]> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
    const start = this.assertSqlDatetime(windowStartSql, 'windowStart');
    const end = this.assertSqlDatetime(windowEndSql, 'windowEnd');
    const exclude = excludeCommunicationId
      ? ` AND Communication_ID <> ${validatePositiveInt(Math.trunc(excludeCommunicationId))}`
      : '';
    const ids: number[] = [];
    let skip = 0;
    for (;;) {
      const page = await this.mp!.getTableRecords<{ Communication_ID: number }>({
        table: 'dp_Communications',
        select: 'Communication_ID',
        filter:
          `Start_Date >= '${start}' AND Start_Date <= '${end}' AND Template = 0` +
          ` AND Communication_Status_ID IN (${this.inList(PENDING_STATUS_IDS)})${exclude}`,
        orderBy: 'Communication_ID',
        top: MP_MAX_PAGE_SIZE,
        skip,
      });
      ids.push(...page.map((r) => r.Communication_ID));
      if (page.length < MP_MAX_PAGE_SIZE) break;
      skip += MP_MAX_PAGE_SIZE;
    }
    return ids;
  }

  /** Non-deleted message rows per communication; IDs with no rows are absent. */
  public async countRecipients(communicationIds: number[]): Promise<Map<number, number>> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communication_Messages', operation: 'read' });
    const unique = [...new Set(communicationIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    const counts = new Map<number, number>();
    for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
      const rows = await this.mp!.getTableRecords<RecipientCountRow>({
        table: 'dp_Communication_Messages',
        select: 'Communication_ID, COUNT(*) AS Recipient_Count',
        filter: `Communication_ID IN (${this.inList(batch)}) AND Deleted = 0`,
        groupBy: 'Communication_ID',
      });
      for (const [id, count] of this.toCountMap(rows)) counts.set(id, count);
    }
    return counts;
  }

  /** Subject, timing, type, status, author, and sending number for each communication. */
  public async getCommunicationDetails(communicationIds: number[]): Promise<CommunicationDetailRow[]> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
    const unique = [...new Set(communicationIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    const rows: CommunicationDetailRow[] = [];
    for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
      const page = await this.mp!.getTableRecords<CommunicationDetailRow>({
        table: 'dp_Communications',
        select: [
          'dp_Communications.Communication_ID',
          'dp_Communications.Subject',
          'dp_Communications.Start_Date',
          'dp_Communications.Communication_Type_ID',
          'Communication_Type_ID_TABLE.Communication_Type',
          'dp_Communications.Communication_Status_ID',
          'Communication_Status_ID_TABLE.Status',
          'Author_User_ID_TABLE.Display_Name AS Author_Name',
          'From_SMS_Number_TABLE.Number_Title AS From_Number',
        ].join(', '),
        filter: `dp_Communications.Communication_ID IN (${this.inList(batch)})`,
      });
      rows.push(...page);
    }
    return rows;
  }

  /** Stored bodies for texts, so segments can be estimated. Keyed by Communication_ID. */
  public async getCommunicationBodies(communicationIds: number[]): Promise<Map<number, string>> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
    const unique = [...new Set(communicationIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    const bodies = new Map<number, string>();
    for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
      const rows = await this.mp!.getTableRecords<{ Communication_ID: number; Body: string | null }>({
        table: 'dp_Communications',
        select: 'Communication_ID, Body',
        filter: `Communication_ID IN (${this.inList(batch)})`,
      });
      for (const row of rows) bodies.set(row.Communication_ID, row.Body ?? '');
    }
    return bodies;
  }

  /**
   * How many of `contactIds` are on each candidate communication. Two read plans:
   * batches of recipient IDs against every candidate at once (cheap when the planned
   * send is small), or paging each candidate's message rows (cheap when the planned
   * send is large and the candidates are not). The cheaper plan runs; when even that
   * exceeds `maxReads`, candidates are counted in the given order until the budget
   * is spent and the rest are reported as null.
   */
  public async countRecipientOverlap(
    candidates: Array<{ communicationId: number; recipientCount: number }>,
    contactIds: number[],
    maxReads: number = MESSAGING_COLLISION_MAX_OVERLAP_READS
  ): Promise<Map<number, number | null>> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communication_Messages', operation: 'read' });
    const overlap = new Map<number, number | null>();
    const unique = [...new Set(contactIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    for (const c of candidates) overlap.set(c.communicationId, null);
    if (unique.length === 0 || candidates.length === 0) return overlap;

    const batchReads = Math.ceil(unique.length / MP_FETCH_BATCH_SIZE);
    const pageReads = candidates.reduce((sum, c) => sum + Math.max(1, Math.ceil(c.recipientCount / MP_MAX_PAGE_SIZE)), 0);

    if (batchReads <= pageReads && batchReads <= maxReads) {
      for (const c of candidates) overlap.set(c.communicationId, 0);
      const candidateList = this.inList(candidates.map((c) => c.communicationId));
      for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
        const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
        const rows = await this.mp!.getTableRecords<{ Communication_ID: number; Overlap: number }>({
          table: 'dp_Communication_Messages',
          select: 'Communication_ID, COUNT(DISTINCT Contact_ID) AS Overlap',
          filter: `Communication_ID IN (${candidateList}) AND Contact_ID IN (${this.inList(batch)}) AND Deleted = 0`,
          groupBy: 'Communication_ID',
        });
        for (const row of rows) {
          overlap.set(row.Communication_ID, (overlap.get(row.Communication_ID) ?? 0) + Number(row.Overlap ?? 0));
        }
      }
      return overlap;
    }

    const planned = new Set(unique);
    let readsLeft = maxReads;
    for (const c of candidates) {
      const pages = Math.max(1, Math.ceil(c.recipientCount / MP_MAX_PAGE_SIZE));
      if (pages > readsLeft) break;
      let matched = 0;
      let skip = 0;
      for (;;) {
        const page = await this.mp!.getTableRecords<{ Contact_ID: number | null }>({
          table: 'dp_Communication_Messages',
          select: 'Contact_ID',
          filter: `Communication_ID = ${validatePositiveInt(c.communicationId)} AND Deleted = 0`,
          orderBy: 'Contact_ID',
          distinct: true,
          top: MP_MAX_PAGE_SIZE,
          skip,
        });
        readsLeft -= 1;
        for (const row of page) {
          if (typeof row.Contact_ID === 'number' && planned.has(row.Contact_ID)) matched += 1;
        }
        if (page.length < MP_MAX_PAGE_SIZE || readsLeft <= 0) break;
        skip += MP_MAX_PAGE_SIZE;
      }
      overlap.set(c.communicationId, matched);
      if (readsLeft <= 0) break;
    }
    return overlap;
  }

  // =====================================================================
  // Orchestration
  // =====================================================================

  /**
   * Finds communications near `sendAt`: every large one in the window, plus (when the
   * planned send is itself large) every one still waiting to go out. Results are
   * ordered by start time and capped at `maxResults`; overlap is counted for the
   * returned rows when recipient IDs are supplied.
   */
  public async findCollisions(options: CollisionSearchOptions): Promise<MessagingCollisionResult> {
    await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
    const tz = DomainTimezoneService.getInstance();
    const settings = await getMessagingSettings();
    const lookbackHours = positiveOr(options.lookbackHours, settings.lookbackHours);
    const lookaheadHours = positiveOr(options.lookaheadHours, settings.lookaheadHours);
    const threshold = Math.trunc(positiveOr(options.largeSendThreshold, settings.largeSendThreshold));
    const highImpactThreshold = Math.trunc(positiveOr(options.highImpactThreshold, settings.highImpactThreshold));
    const criticalHours = positiveOr(options.criticalHours, settings.criticalHours);
    const segmentsPerSecond = positiveOr(options.segmentsPerSecond, settings.segmentsPerSecond);
    const emailsPerSecond = positiveOr(options.emailsPerSecond, settings.emailsPerSecond);
    const modelQueue = options.plannedChannel === 'sms' || options.plannedChannel === 'email';
    const plannedSegments = Math.max(1, Math.trunc(positiveOr(options.plannedSegments, 1)));
    const deliveryMinutes = (channel: MessagingChannel, recipients: number, segments: number): number | null =>
      channel === 'sms'
        ? (recipients * segments) / segmentsPerSecond / 60
        : channel === 'email'
          ? recipients / emailsPerSecond / 60
          : null;
    const plannedDeliveryMinutes = modelQueue
      ? deliveryMinutes(options.plannedChannel!, options.recipientCount, plannedSegments)
      : null;
    const maxResults = Math.trunc(positiveOr(options.maxResults, MESSAGING_COLLISION_MAX_RESULTS));
    const channels = new Set<MessagingChannel>(options.channels?.length ? options.channels : ['email', 'sms']);
    const sendAt = options.sendAt;
    if (Number.isNaN(sendAt.getTime())) throw new Error('sendAt is not a valid instant');

    const windowStart = new Date(sendAt.getTime() - lookbackHours * HOUR_MS);
    const windowEnd = new Date(sendAt.getTime() + lookaheadHours * HOUR_MS);
    const [startSql, endSql] = await Promise.all([tz.toMpSqlDatetime(windowStart), tz.toMpSqlDatetime(windowEnd)]);
    const plannedIsLarge = options.recipientCount > threshold;

    const [large, pendingIds] = await Promise.all([
      this.findLargeCommunications(startSql, endSql, threshold, options.excludeCommunicationId),
      plannedIsLarge
        ? this.findPendingCommunicationIds(startSql, endSql, options.excludeCommunicationId)
        : Promise.resolve([] as number[]),
    ]);

    const counts = new Map(large);
    const uncounted = pendingIds.filter((id) => !counts.has(id));
    if (uncounted.length > 0) {
      for (const [id, count] of await this.countRecipients(uncounted)) {
        if (count > 0) counts.set(id, count);
      }
    }

    const details = counts.size > 0 ? await this.getCommunicationDetails([...counts.keys()]) : [];
    // Drafts are filtered at the source; this guards any other path into the list.
    const candidates = details.filter(
      (row) =>
        channels.has(channelForType(row.Communication_Type)) &&
        row.Communication_Status_ID !== TEXT_COMMUNICATION_STATUS_DRAFT_ID
    );
    const smsIds = modelQueue
      ? candidates.filter((row) => channelForType(row.Communication_Type) === 'sms').map((row) => row.Communication_ID)
      : [];
    const bodies = smsIds.length > 0 ? await this.getCommunicationBodies(smsIds) : new Map<number, string>();

    // Resolve timing and delivery length for every candidate, then run the one serial
    // queue MP uses for email and text alike.
    const prepared: Array<{
      row: CommunicationDetailRow;
      channel: MessagingChannel;
      startInstant: Date;
      recipientCount: number;
      estimatedSegments: number | null;
      estimatedDeliveryMinutes: number | null;
    }> = [];
    for (const row of candidates) {
      const channel = channelForType(row.Communication_Type);
      const startInstant = await tz.parseMpDatetime(row.Start_Date);
      const recipientCount = counts.get(row.Communication_ID) ?? 0;
      let estimatedSegments: number | null = null;
      let estimatedDeliveryMinutes: number | null = null;
      if (modelQueue) {
        if (channel === 'sms') {
          const body = bodies.get(row.Communication_ID) ?? row.Subject ?? '';
          estimatedSegments = Math.max(1, analyzeSms(body).segments);
        }
        estimatedDeliveryMinutes = deliveryMinutes(channel, recipientCount, estimatedSegments ?? 1);
      }
      prepared.push({ row, channel, startInstant, recipientCount, estimatedSegments, estimatedDeliveryMinutes });
    }

    // A Sent email is done: the worker handed it to the mail server. A Sent text is not
    // necessarily delivered, since the carrier drains its own queue, so texts stay in.
    const stillOccupiesQueue = (p: { channel: MessagingChannel; row: CommunicationDetailRow }) =>
      !(p.channel === 'email' && p.row.Communication_Status_ID === TEXT_COMMUNICATION_STATUS_SENT_ID);

    const queue =
      modelQueue && plannedDeliveryMinutes !== null
        ? simulateSerialQueue({
            sendAtMs: sendAt.getTime(),
            plannedDurationMinutes: plannedDeliveryMinutes,
            others: prepared
              .filter((p) => p.estimatedDeliveryMinutes !== null && stillOccupiesQueue(p))
              .map((p) => ({
                id: p.row.Communication_ID,
                startMs: p.startInstant.getTime(),
                durationMinutes: p.estimatedDeliveryMinutes!,
              })),
          })
        : null;

    const collisions: MessagingCollision[] = [];
    for (const { row, channel, startInstant, recipientCount, estimatedSegments, estimatedDeliveryMinutes } of prepared) {
      const hoursFromSendAt = Math.round(((startInstant.getTime() - sendAt.getTime()) / HOUR_MS) * 10) / 10;
      const isLarge = recipientCount > threshold;
      const queueDelayMinutes = queue?.delays.get(row.Communication_ID) ?? null;
      const interferes = queueDelayMinutes !== null && queueDelayMinutes >= INTERFERENCE_MINUTES;
      // Small sends only matter when they would actually queue against this one.
      if (!isLarge && !interferes) continue;

      collisions.push({
        communicationId: row.Communication_ID,
        subject: (row.Subject ?? '').trim(),
        channel,
        channelLabel: row.Communication_Type ?? 'Message',
        statusLabel: row.Status ?? (startInstant.getTime() > Date.now() ? 'Scheduled' : 'Sent'),
        isPending: row.Communication_Status_ID !== null && PENDING_STATUS_IDS.includes(row.Communication_Status_ID),
        startAt: startInstant.toISOString(),
        hoursFromSendAt,
        authorName: row.Author_Name ?? null,
        fromLabel: channel === 'sms' ? (row.From_Number ?? null) : null,
        recipientCount,
        isLarge,
        isHighImpact: recipientCount > highImpactThreshold,
        isCritical: Math.abs(startInstant.getTime() - sendAt.getTime()) <= criticalHours * HOUR_MS,
        estimatedSegments,
        estimatedDeliveryMinutes: estimatedDeliveryMinutes === null ? null : Math.round(estimatedDeliveryMinutes * 10) / 10,
        queueDelayMinutes,
        interferes,
        overlapCount: null,
      });
    }

    // Keep the ones nearest the planned time when capping, then present in start order.
    const byProximity = [...collisions].sort(
      (a, b) => Math.abs(a.hoursFromSendAt) - Math.abs(b.hoursFromSendAt) || a.communicationId - b.communicationId
    );
    const kept = byProximity
      .slice(0, maxResults)
      .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.communicationId - b.communicationId);
    const truncatedCount = collisions.length - kept.length;

    const contactIds = options.recipientContactIds ?? [];
    const overlapChecked = contactIds.length > 0 && kept.length > 0;
    if (overlapChecked) {
      // Nearest to the planned time first, so a spent budget leaves the far ones unknown.
      const nearestFirst = [...kept].sort((a, b) => Math.abs(a.hoursFromSendAt) - Math.abs(b.hoursFromSendAt));
      const overlap = await this.countRecipientOverlap(
        nearestFirst.map((c) => ({ communicationId: c.communicationId, recipientCount: c.recipientCount })),
        contactIds,
        options.maxOverlapReads
      );
      for (const c of kept) c.overlapCount = overlap.get(c.communicationId) ?? null;
    }

    return {
      sendAt: sendAt.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      lookbackHours,
      lookaheadHours,
      largeSendThreshold: threshold,
      highImpactThreshold,
      criticalHours,
      segmentsPerSecond,
      emailsPerSecond,
      plannedDeliveryMinutes: plannedDeliveryMinutes === null ? null : Math.round(plannedDeliveryMinutes * 10) / 10,
      plannedQueueDelayMinutes: queue ? queue.plannedDelayMinutes : null,
      plannedIsLarge,
      collisions: kept,
      truncatedCount,
      overlapChecked,
    };
  }

  private toCountMap(rows: RecipientCountRow[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const row of rows) {
      const id = Number(row.Communication_ID);
      const count = Number(row.Recipient_Count);
      if (Number.isFinite(id) && id > 0 && Number.isFinite(count)) map.set(id, count);
    }
    return map;
  }
}

function positiveOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTableRecords, mockToMpSqlDatetime, mockParseMpDatetime } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
  mockToMpSqlDatetime: vi.fn(),
  mockParseMpDatetime: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
  },
}));

vi.mock('@/services/domainTimezoneService', () => ({
  DomainTimezoneService: {
    getInstance: vi.fn().mockReturnValue({
      toMpSqlDatetime: mockToMpSqlDatetime,
      parseMpDatetime: mockParseMpDatetime,
    }),
  },
}));

const mockRequireSecurityRole = vi.hoisted(() => vi.fn().mockResolvedValue(42));
vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: { getInstance: () => ({ requireSecurityRole: mockRequireSecurityRole }) },
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message = 'Not authorized') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
}));
const mockGetMessagingSettings = vi.hoisted(() => vi.fn());
vi.mock('@/services/messagingSettings', () => ({ getMessagingSettings: mockGetMessagingSettings }));

const DEFAULT_SETTINGS = {
  largeSendThreshold: 1000,
  highImpactThreshold: 10000,
  lookbackHours: 12,
  lookaheadHours: 12,
  criticalHours: 2,
  segmentsPerSecond: 3,
  emailsPerSecond: 4,
  smsCostPerSegment: 0.0083,
  mmsCostPerMessage: 0.022,
};

import { MessagingCollisionService, channelForType, simulateSerialQueue } from './messagingCollisionService';

/** Phoenix has no DST, so wall-clock = UTC - 7 all year. */
function phoenixSql(date: Date): string {
  const local = new Date(date.getTime() - 7 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}
function phoenixParse(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}${value.includes('.') ? '' : ''}-07:00`);
}

function detail(id: number, overrides: Record<string, unknown> = {}) {
  return {
    Communication_ID: id,
    Subject: `Message ${id}`,
    Start_Date: '2026-09-17T08:00:00',
    Communication_Type_ID: 1,
    Communication_Type: 'Email',
    Communication_Status_ID: 4,
    Status: 'Sent',
    Author_Name: 'Staff, Sam',
    From_Number: null,
    ...overrides,
  };
}

describe('MessagingCollisionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (MessagingCollisionService as unknown as { instance: unknown }).instance = undefined;
    mockToMpSqlDatetime.mockImplementation(async (v: Date) => phoenixSql(v));
    mockParseMpDatetime.mockImplementation(async (v: string) => phoenixParse(v));
    mockGetMessagingSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  });

  it('returns a singleton', async () => {
    const a = await MessagingCollisionService.getInstance();
    const b = await MessagingCollisionService.getInstance();
    expect(a).toBe(b);
  });

  describe('channelForType', () => {
    it('maps MP type names to channels', () => {
      expect(channelForType('Email')).toBe('email');
      expect(channelForType('SMS Text')).toBe('sms');
      expect(channelForType('Text Message')).toBe('sms');
      expect(channelForType('RSS Feed')).toBe('other');
      expect(channelForType(null)).toBe('other');
    });
  });

  describe('findLargeCommunications', () => {
    it('groups message rows by communication with a having clause over the window', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Communication_ID: 10, Recipient_Count: 1500 },
        { Communication_ID: 11, Recipient_Count: '2000' },
      ]);
      const service = await MessagingCollisionService.getInstance();
      const counts = await service.findLargeCommunications('2026-09-17 00:00:00', '2026-09-17 12:00:00', 1000, 99);
      expect([...counts]).toEqual([
        [10, 1500],
        [11, 2000],
      ]);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'dp_Communication_Messages',
          select: 'dp_Communication_Messages.Communication_ID, COUNT(*) AS Recipient_Count',
          groupBy: 'dp_Communication_Messages.Communication_ID',
          having: 'COUNT(*) > 1000',
        })
      );
      const filter = mockGetTableRecords.mock.calls[0][0].filter as string;
      expect(filter).toContain("Communication_ID_TABLE.Start_Date >= '2026-09-17 00:00:00'");
      expect(filter).toContain("Communication_ID_TABLE.Start_Date <= '2026-09-17 12:00:00'");
      expect(filter).toContain('Communication_ID_TABLE.Template = 0');
      expect(filter).toContain('Communication_ID_TABLE.Communication_Status_ID <> 1');
      expect(filter).toContain('dp_Communication_Messages.Deleted = 0');
      expect(filter).toContain('dp_Communication_Messages.Communication_ID <> 99');
    });

    it('rejects window bounds that are not MP SQL datetimes', async () => {
      const service = await MessagingCollisionService.getInstance();
      await expect(service.findLargeCommunications('2026-09-17T00:00:00Z', '2026-09-17 12:00:00', 1000)).rejects.toThrow(
        'windowStart'
      );
    });
  });

  describe('findPendingCommunicationIds', () => {
    it('reads In Review and Ready to Send communications in the window (never Drafts), paging', async () => {
      const firstPage = Array.from({ length: 1000 }, (_, i) => ({ Communication_ID: i + 1 }));
      mockGetTableRecords.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([{ Communication_ID: 1001 }]);
      const service = await MessagingCollisionService.getInstance();
      const ids = await service.findPendingCommunicationIds('2026-09-17 00:00:00', '2026-09-17 12:00:00');
      expect(ids).toHaveLength(1001);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      const first = mockGetTableRecords.mock.calls[0][0];
      expect(first.table).toBe('dp_Communications');
      expect(first.filter).toContain('Communication_Status_ID IN (2,3)');
      expect(first.filter).toContain('Template = 0');
      expect(mockGetTableRecords.mock.calls[1][0].skip).toBe(1000);
    });
  });

  describe('countRecipients', () => {
    it('batches IDs and skips communications with no rows', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      mockGetTableRecords
        .mockResolvedValueOnce([{ Communication_ID: 1, Recipient_Count: 5 }])
        .mockResolvedValueOnce([{ Communication_ID: 150, Recipient_Count: 7 }]);
      const service = await MessagingCollisionService.getInstance();
      const counts = await service.countRecipients(ids);
      expect(counts.get(1)).toBe(5);
      expect(counts.get(150)).toBe(7);
      expect(counts.has(2)).toBe(false);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      expect(mockGetTableRecords.mock.calls[0][0].filter).toMatch(/^Communication_ID IN \(1,2,3,.*100\) AND Deleted = 0$/);
    });
  });

  describe('countRecipientOverlap', () => {
    it('uses recipient batches when the planned send is small', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Communication_ID: 10, Overlap: 3 },
        { Communication_ID: 11, Overlap: 0 },
      ]);
      const service = await MessagingCollisionService.getInstance();
      const overlap = await service.countRecipientOverlap(
        [
          { communicationId: 10, recipientCount: 8000 },
          { communicationId: 11, recipientCount: 3000 },
        ],
        [1, 2, 3, 4, 5]
      );
      expect(overlap.get(10)).toBe(3);
      expect(overlap.get(11)).toBe(0);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          select: 'Communication_ID, COUNT(DISTINCT Contact_ID) AS Overlap',
          filter: 'Communication_ID IN (10,11) AND Contact_ID IN (1,2,3,4,5) AND Deleted = 0',
          groupBy: 'Communication_ID',
        })
      );
    });

    it('pages each candidate when the planned send is large and honours the read budget', async () => {
      const planned = Array.from({ length: 5000 }, (_, i) => i + 1); // 50 batch reads
      // Candidate 10: one page containing planned contacts 1..3 and a stranger.
      mockGetTableRecords.mockResolvedValueOnce([{ Contact_ID: 1 }, { Contact_ID: 2 }, { Contact_ID: 3 }, { Contact_ID: 999999 }]);
      const service = await MessagingCollisionService.getInstance();
      const overlap = await service.countRecipientOverlap(
        [
          { communicationId: 10, recipientCount: 400 },
          { communicationId: 11, recipientCount: 5000 }, // 5 pages, over the remaining budget
        ],
        planned,
        3
      );
      expect(overlap.get(10)).toBe(3);
      expect(overlap.get(11)).toBeNull();
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          select: 'Contact_ID',
          filter: 'Communication_ID = 10 AND Deleted = 0',
          distinct: true,
          top: 1000,
          skip: 0,
        })
      );
    });

    it('returns nulls without reading when there are no recipients', async () => {
      const service = await MessagingCollisionService.getInstance();
      const overlap = await service.countRecipientOverlap([{ communicationId: 10, recipientCount: 5 }], []);
      expect(overlap.get(10)).toBeNull();
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('simulateSerialQueue', () => {
    const sendAtMs = Date.UTC(2026, 8, 17, 16, 0);
    const min = 60_000;

    it('is idle with nothing else queued', () => {
      const q = simulateSerialQueue({ sendAtMs, plannedDurationMinutes: 30, others: [] });
      expect(q.plannedDelayMinutes).toBe(0);
      expect(q.delays.size).toBe(0);
    });

    it('holds the planned send behind an earlier message and pushes later ones back by only its own length', () => {
      const q = simulateSerialQueue({
        sendAtMs,
        plannedDurationMinutes: 30,
        others: [
          { id: 1, startMs: sendAtMs - 10 * min, durationMinutes: 25 }, // still going 15 min after the planned start
          { id: 2, startMs: sendAtMs + 20 * min, durationMinutes: 1 }, // would start on time without the planned send
        ],
      });
      expect(q.plannedDelayMinutes).toBe(15);
      expect(q.delays.get(1)).toBe(15);
      // Planned runs 16:15 to 16:45, so #2 starts at 16:45 instead of 16:20.
      expect(q.delays.get(2)).toBe(25);
    });

    it('chains earlier messages in scheduled order', () => {
      const q = simulateSerialQueue({
        sendAtMs,
        plannedDurationMinutes: 5,
        others: [
          { id: 2, startMs: sendAtMs - 15 * min, durationMinutes: 20 }, // waits for #1, runs 15:50 to 16:10
          { id: 1, startMs: sendAtMs - 60 * min, durationMinutes: 50 }, // runs 15:00 to 15:50
        ],
      });
      expect(q.delays.get(1)).toBe(0);
      expect(q.delays.get(2)).toBe(10);
      expect(q.plannedDelayMinutes).toBe(10);
    });

    it('does not blame the planned send for a later message already delayed by others', () => {
      const q = simulateSerialQueue({
        sendAtMs,
        plannedDurationMinutes: 10,
        others: [
          { id: 1, startMs: sendAtMs + 5 * min, durationMinutes: 60 },
          { id: 2, startMs: sendAtMs + 10 * min, durationMinutes: 1 }, // already waits for #1 either way
        ],
      });
      // Planned runs 16:00 to 16:10; #1 starts 16:10 instead of 16:05 (5 min); #2 starts 17:10 instead of 17:05 (5 min).
      expect(q.plannedDelayMinutes).toBe(0);
      expect(q.delays.get(1)).toBe(5);
      expect(q.delays.get(2)).toBe(5);
    });
  });

  describe('findCollisions', () => {
    const sendAt = new Date('2026-09-17T16:00:00Z'); // 09:00 Phoenix

    it('reports large sends only when the planned send is small', async () => {
      mockGetTableRecords
        // findLargeCommunications
        .mockResolvedValueOnce([{ Communication_ID: 10, Recipient_Count: 1500 }])
        // getCommunicationDetails
        .mockResolvedValueOnce([detail(10, { Start_Date: '2026-09-17T07:00:00', Communication_Type: 'SMS Text', From_Number: 'Main' })]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({ sendAt, recipientCount: 200, lookbackHours: 6, lookaheadHours: 6 });

      expect(result.plannedIsLarge).toBe(false);
      expect(result.windowStart).toBe('2026-09-17T10:00:00.000Z');
      expect(result.windowEnd).toBe('2026-09-17T22:00:00.000Z');
      expect(mockToMpSqlDatetime).toHaveBeenCalledTimes(2);
      // No pending read, no overlap read.
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      expect(result.collisions).toEqual([
        expect.objectContaining({
          communicationId: 10,
          channel: 'sms',
          channelLabel: 'SMS Text',
          fromLabel: 'Main',
          statusLabel: 'Sent',
          isPending: false,
          isLarge: true,
          isHighImpact: false,
          isCritical: true,
          estimatedSegments: null,
          queueDelayMinutes: null,
          interferes: false,
          recipientCount: 1500,
          hoursFromSendAt: -2,
          startAt: '2026-09-17T14:00:00.000Z',
          overlapCount: null,
        }),
      ]);
      expect(result.overlapChecked).toBe(false);
      expect(result.truncatedCount).toBe(0);
      expect(result.criticalHours).toBe(2);
      expect(result.highImpactThreshold).toBe(10000);
      expect(result.plannedDeliveryMinutes).toBeNull();
    });

    it("models the text queue when the planned send is a text: keeps small texts that would queue, drops the rest", async () => {
      mockGetTableRecords
        // findLargeCommunications: one large email far away
        .mockResolvedValueOnce([{ Communication_ID: 1, Recipient_Count: 1500 }])
        // findPendingCommunicationIds (planned is large)
        .mockResolvedValueOnce([{ Communication_ID: 2 }, { Communication_ID: 3 }])
        // countRecipients for 2 and 3
        .mockResolvedValueOnce([
          { Communication_ID: 2, Recipient_Count: 900 },
          { Communication_ID: 3, Recipient_Count: 104 },
        ])
        // getCommunicationDetails
        .mockResolvedValueOnce([
          detail(1, { Start_Date: "2026-09-17T04:00:00" }), // email, 5 hours before, no queue model
          detail(2, { Start_Date: "2026-09-17T08:55:00", Communication_Type: "SMS Text", Communication_Status_ID: 3, Status: "Ready to Send" }), // 5 min before
          detail(3, { Start_Date: "2026-09-17T08:00:00", Communication_Type: "SMS Text", Communication_Status_ID: 3, Status: "Ready to Send" }), // 1 hour before
        ])
        // getCommunicationBodies for the two texts: 2 has a two-segment body, 3 a short one
        .mockResolvedValueOnce([
          { Communication_ID: 2, Body: "x".repeat(200) },
          { Communication_ID: 3, Body: "short" },
        ]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({
        sendAt,
        recipientCount: 5000,
        plannedChannel: "sms",
        plannedSegments: 2,
        segmentsPerSecond: 3,
      });

      // Planned: 5000 x 2 / 3 per second = 55.6 minutes.
      expect(result.plannedDeliveryMinutes).toBe(55.6);
      expect(mockGetTableRecords.mock.calls[4][0]).toEqual(
        expect.objectContaining({ table: "dp_Communications", select: "Communication_ID, Body", filter: "Communication_ID IN (2,3)" })
      );
      // #3: 104 x 1 segment / 3 = 35 s, finished long before the planned start: dropped.
      // #2: 900 x 2 / 3 = 600 s = 10 min, starting 5 min before: still sending 5 min into the planned send.
      expect(result.collisions.map((c) => c.communicationId)).toEqual([1, 2]);
      const text = result.collisions[1];
      expect(text).toEqual(
        expect.objectContaining({
          estimatedSegments: 2,
          estimatedDeliveryMinutes: 10,
          queueDelayMinutes: 5,
          interferes: true,
          isLarge: false,
        })
      );
      const email = result.collisions[0];
      // Email: 1500 / 4 per second = 6.25 min of worker time, but it is already Sent, so it
      // takes no part in the queue estimate.
      expect(email).toEqual(
        expect.objectContaining({ estimatedSegments: null, estimatedDeliveryMinutes: 6.3, queueDelayMinutes: null, interferes: false })
      );
      expect(result.emailsPerSecond).toBe(4);
      // #2 is still going 5 min into the planned start, so the planned text starts 5 min late.
      expect(result.plannedQueueDelayMinutes).toBe(5);
    });

    it("flags high impact sends and the critical band, and keeps the nearest when capping", async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([
          { Communication_ID: 1, Recipient_Count: 12000 },
          { Communication_ID: 2, Recipient_Count: 1500 },
          { Communication_ID: 3, Recipient_Count: 1500 },
        ])
        .mockResolvedValueOnce([
          detail(1, { Start_Date: "2026-09-17T04:00:00" }), // 5 hours before
          detail(2, { Start_Date: "2026-09-17T08:30:00" }), // 30 minutes before
          detail(3, { Start_Date: "2026-09-17T10:30:00" }), // 1.5 hours after
        ]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({ sendAt, recipientCount: 10, maxResults: 2, criticalHours: 2, highImpactThreshold: 10000 });
      expect(result.collisions.map((c) => c.communicationId)).toEqual([2, 3]);
      expect(result.truncatedCount).toBe(1);
      expect(result.collisions.map((c) => c.isCritical)).toEqual([true, true]);

      mockGetTableRecords
        .mockResolvedValueOnce([{ Communication_ID: 1, Recipient_Count: 12000 }])
        .mockResolvedValueOnce([detail(1, { Start_Date: "2026-09-17T04:00:00" })]);
      const far = await service.findCollisions({ sendAt, recipientCount: 10 });
      expect(far.collisions[0]).toEqual(expect.objectContaining({ isHighImpact: true, isCritical: false, hoursFromSendAt: -5 }));
    });

    it('keeps a small pending text when the planned send is large and it would queue against it', async () => {
      mockGetTableRecords
        // findLargeCommunications
        .mockResolvedValueOnce([{ Communication_ID: 10, Recipient_Count: 1500 }])
        // findPendingCommunicationIds: 10 is already counted, 20 and 30 are not
        .mockResolvedValueOnce([{ Communication_ID: 10 }, { Communication_ID: 20 }, { Communication_ID: 30 }])
        // countRecipients for 20 and 30 (30 has no rows)
        .mockResolvedValueOnce([{ Communication_ID: 20, Recipient_Count: 40 }])
        // getCommunicationDetails
        .mockResolvedValueOnce([
          detail(10, { Start_Date: '2026-09-17T11:00:00' }),
          detail(20, {
            Start_Date: '2026-09-17T09:02:00',
            Communication_Type: 'SMS Text',
            Communication_Status_ID: 3,
            Status: 'Ready to Send',
          }),
        ])
        // getCommunicationBodies for the one text
        .mockResolvedValueOnce([{ Communication_ID: 20, Body: 'Short reminder' }])
        // countRecipientOverlap (batch plan: 1 batch of 3 contacts)
        .mockResolvedValueOnce([{ Communication_ID: 20, Overlap: 2 }]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({
        sendAt,
        recipientCount: 1200,
        recipientContactIds: [1, 2, 3],
        lookbackHours: 6,
        lookaheadHours: 6,
        plannedChannel: 'sms',
        plannedSegments: 1,
        segmentsPerSecond: 3,
      });

      expect(result.plannedIsLarge).toBe(true);
      // Planned: 1200 / 3 = 400 s = 6.7 min, so a text starting 2 min in waits about 5 min.
      expect(result.plannedDeliveryMinutes).toBe(6.7);
      expect(result.plannedQueueDelayMinutes).toBe(0);
      expect(mockGetTableRecords.mock.calls[2][0].filter).toBe('Communication_ID IN (20,30) AND Deleted = 0');
      expect(result.collisions.map((c) => c.communicationId)).toEqual([20, 10]);
      expect(result.collisions[0]).toEqual(
        expect.objectContaining({
          isPending: true,
          isLarge: false,
          recipientCount: 40,
          overlapCount: 2,
          hoursFromSendAt: 0,
          interferes: true,
          queueDelayMinutes: 5,
        })
      );
      expect(result.collisions[1]).toEqual(expect.objectContaining({ isPending: false, isLarge: true, overlapCount: 0 }));
      expect(result.overlapChecked).toBe(true);
    });

    it('drops channels the caller did not ask for and caps the list', async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([
          { Communication_ID: 1, Recipient_Count: 2000 },
          { Communication_ID: 2, Recipient_Count: 2000 },
          { Communication_ID: 3, Recipient_Count: 2000 },
        ])
        .mockResolvedValueOnce([
          detail(1, { Start_Date: '2026-09-17T08:00:00' }),
          detail(2, { Start_Date: '2026-09-17T08:30:00', Communication_Type: 'RSS Feed' }),
          detail(3, { Start_Date: '2026-09-17T10:00:00' }),
        ]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({ sendAt, recipientCount: 10, maxResults: 1, channels: ['email'] });
      expect(result.collisions.map((c) => c.communicationId)).toEqual([1]);
      expect(result.truncatedCount).toBe(1);
    });

    it('keeps Sent texts in the queue estimate, leaves Sent emails out, and skips Drafts', async () => {
      mockGetTableRecords
        // findLargeCommunications: all three large (a Draft slipping through is guarded in code)
        .mockResolvedValueOnce([
          { Communication_ID: 1, Recipient_Count: 6000 },
          { Communication_ID: 2, Recipient_Count: 6000 },
          { Communication_ID: 3, Recipient_Count: 6000 },
        ])
        // getCommunicationDetails: #1 Sent email, #2 Sent text, #3 Draft text, all 10 min before
        .mockResolvedValueOnce([
          detail(1, { Start_Date: '2026-09-17T08:50:00', Communication_Status_ID: 4, Status: 'Sent' }),
          detail(2, {
            Start_Date: '2026-09-17T08:50:00',
            Communication_Type: 'SMS Text',
            Communication_Status_ID: 4,
            Status: 'Sent',
          }),
          detail(3, {
            Start_Date: '2026-09-17T08:50:00',
            Communication_Type: 'SMS Text',
            Communication_Status_ID: 1,
            Status: 'Draft',
          }),
        ])
        // getCommunicationBodies for the Sent text only (the Draft never gets this far)
        .mockResolvedValueOnce([{ Communication_ID: 2, Body: 'x'.repeat(200) }]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({
        sendAt,
        recipientCount: 10,
        plannedChannel: 'sms',
        plannedSegments: 1,
        segmentsPerSecond: 3,
        emailsPerSecond: 4,
      });

      expect(result.collisions.map((c) => c.communicationId)).toEqual([1, 2]);
      expect(mockGetTableRecords.mock.calls[2][0].filter).toBe('Communication_ID IN (2)');
      const [email, text] = result.collisions;
      // 6000 emails / 4 per second = 25 min, still "running" at the planned start, but Sent means done.
      expect(email).toEqual(expect.objectContaining({ estimatedDeliveryMinutes: 25, queueDelayMinutes: null, interferes: false }));
      // 6000 texts x 2 segments / 3 per second = 66.7 min; 10 min in, about 57 remain at the carrier.
      expect(text).toEqual(expect.objectContaining({ estimatedDeliveryMinutes: 66.7, queueDelayMinutes: 57, interferes: true }));
      expect(result.plannedQueueDelayMinutes).toBe(57);
    });

    it('takes its defaults from the church settings and lets options override them', async () => {
      mockGetMessagingSettings.mockResolvedValueOnce({
        ...DEFAULT_SETTINGS,
        largeSendThreshold: 500,
        lookbackHours: 3,
        lookaheadHours: 1,
        criticalHours: 1,
        highImpactThreshold: 2000,
        emailsPerSecond: 8,
      });
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await MessagingCollisionService.getInstance();
      const result = await service.findCollisions({ sendAt, recipientCount: 10, lookaheadHours: 2 });
      expect(result.largeSendThreshold).toBe(500);
      expect(result.highImpactThreshold).toBe(2000);
      expect(result.criticalHours).toBe(1);
      expect(result.emailsPerSecond).toBe(8);
      expect(result.lookbackHours).toBe(3);
      expect(result.lookaheadHours).toBe(2); // the option wins
      expect(mockGetTableRecords.mock.calls[0][0].having).toBe('COUNT(*) > 500');
    });

    it('rejects an invalid instant', async () => {
      const service = await MessagingCollisionService.getInstance();
      await expect(service.findCollisions({ sendAt: new Date('nope'), recipientCount: 1 })).rejects.toThrow('sendAt');
    });
  });
});

describe('MessagingCollisionService authorization gate', () => {
  it('propagates a gate rejection before any MP read', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));
    (MessagingCollisionService as unknown as { instance: unknown }).instance = undefined;
    const service = await MessagingCollisionService.getInstance();
    await expect(service.getCommunicationDetails([1])).rejects.toThrow('Not authorized');
    expect(mockGetTableRecords).not.toHaveBeenCalled();
  });
});

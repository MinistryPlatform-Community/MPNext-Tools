import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolParams } from '@/lib/tool-params';

const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockResolveContactIds = vi.hoisted(() => vi.fn());
const mockToMpSqlDatetime = vi.hoisted(() => vi.fn());
const mockGetMpTimezone = vi.hoisted(() => vi.fn());
const mockParseMpDatetime = vi.hoisted(() => vi.fn());
const service = vi.hoisted(() => ({
  getSenderContext: vi.fn(),
  getUserGlobalFilterCongregationIds: vi.fn(),
  getUserTextQuota: vi.fn(),
  countMessages: vi.fn(),
  listSmsNumbersForUser: vi.fn(),
  getSmsNumber: vi.fn(),
  listCongregations: vi.fn(),
  listAudiences: vi.fn(),
  listPublications: vi.fn(),
  getTextCommunicationTypeId: vi.fn(),
  getContactIdsForAudience: vi.fn(),
  getContactIdsForPublication: vi.fn(),
  getSelectedContacts: vi.fn(),
  listMessagingViews: vi.fn(),
  getMessagingViewContacts: vi.fn(),
  getMergeTagsForPage: vi.fn(),
  getTextableContacts: vi.fn(),
  getDomainMessagingData: vi.fn(),
  createCommunication: vi.fn(),
  attachFile: vi.fn(),
  createMessages: vi.fn(),
  setCommunicationStatus: vi.fn(),
}));

const mockRequireSecurityRole = vi.hoisted(() => vi.fn());
vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: { getInstance: () => ({ requireSecurityRole: mockRequireSecurityRole }) },
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message = 'Not authorized') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
}));
vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getSelectionRecordIds: mockGetSelectionRecordIds,
      resolveContactIds: mockResolveContactIds,
    }),
  },
}));
vi.mock('@/services/domainTimezoneService', () => ({
  DomainTimezoneService: {
    getInstance: vi.fn().mockReturnValue({
      toMpSqlDatetime: mockToMpSqlDatetime,
      getMpTimezone: mockGetMpTimezone,
      parseMpDatetime: mockParseMpDatetime,
    }),
  },
}));
vi.mock('@/services/textMessageService', () => ({
  TextMessageService: { getInstance: vi.fn().mockResolvedValue(service) },
}));
vi.mock('@/services/messagingSettings', () => ({
  getMessagingSettings: vi.fn().mockResolvedValue({
    largeSendThreshold: 1000,
    highImpactThreshold: 10000,
    lookbackHours: 12,
    lookaheadHours: 12,
    criticalHours: 2,
    segmentsPerSecond: 3,
    emailsPerSecond: 4,
    smsCostPerSegment: 0.0083,
    mmsCostPerMessage: 0.022,
  }),
}));
const ai = vi.hoisted(() => ({ isEnabled: vi.fn(), rewriteTextMessage: vi.fn() }));
vi.mock('@/services/aiWritingService', () => ({
  AiWritingService: { getInstance: vi.fn().mockResolvedValue(ai) },
}));

import { UnauthorizedError } from '@/services/authorizationService';
import {
  createTextCommunication,
  finalizeTextCommunication,
  getTextToolConfig,
  resolveTextRecipients,
  rewriteTextForSms,
  sendTextChunk,
} from './actions';

function contact(id: number, overrides: Record<string, unknown> = {}) {
  return {
    Contact_ID: id,
    Display_Name: `Person, ${id}`,
    First_Name: `First${id}`,
    Last_Name: 'Person',
    Nickname: null,
    Mobile_Phone: `602555${String(id).padStart(4, '0')}`,
    Email_Address: null,
    Texting_Opt_In_Type_ID: 3,
    Congregation_ID: 3,
    Congregation_Name: 'Phoenix',
    ...overrides,
  };
}

const eventsPage = {
  Page_ID: 308,
  Display_Name: 'Events',
  Singular_Name: 'Event',
  Table_Name: 'Events',
  Primary_Key: 'Event_ID',
  Contact_ID_Field: 'Events.Primary_Contact',
};

function eventParams(extra: Partial<ToolParams>): ToolParams {
  return { pageID: 308, pageData: eventsPage, ...extra };
}

const registeredView = {
  id: 8,
  label: 'Participants: Registered',
  subPageName: 'Participants',
  viewTitle: 'Registered',
  tableName: 'Event_Participants',
  primaryKey: 'Event_Participant_ID',
  contactIdField: 'Participant_ID_Table.Contact_ID',
  parentKey: 'Event_ID',
  viewClause: 'Event_Participants.Participation_Status_ID = 2',
};

const smsNumber = {
  id: 5,
  label: 'Main',
  number: '+16025550100',
  senderLabel: 'Dream City',
  congregationId: null,
  costPerSegment: 0.0079,
  isDefault: true,
  complianceLevelId: 1,
};

describe('text-messaging actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
    mockToMpSqlDatetime.mockResolvedValue('2026-09-16 10:00:00');
    mockGetMpTimezone.mockResolvedValue('America/Phoenix');
    mockParseMpDatetime.mockImplementation(async (value: string) => new Date(`${value.replace(' ', 'T')}-07:00`));
    service.getSenderContext.mockResolvedValue({ userId: 42, contactId: 7, displayName: 'Staff' });
    service.getUserGlobalFilterCongregationIds.mockResolvedValue([]);
    service.getUserTextQuota.mockResolvedValue({ limit: 500, roleNames: ['Staff'] });
    service.listSmsNumbersForUser.mockResolvedValue([smsNumber]);
    service.getSmsNumber.mockResolvedValue(smsNumber);
    service.listCongregations.mockResolvedValue([
      { id: 3, label: 'Phoenix' },
      { id: 9, label: 'Glendale' },
    ]);
    service.listAudiences.mockResolvedValue([]);
    service.listPublications.mockResolvedValue([]);
    service.getTextCommunicationTypeId.mockResolvedValue(2);
    service.getMergeTagsForPage.mockResolvedValue([]);
    service.listMessagingViews.mockResolvedValue([]);
    service.getDomainMessagingData.mockResolvedValue({ curfew: null, approvalProcessConfigured: true });
    service.createMessages.mockImplementation(async (rows: unknown[]) => rows.length);
    ai.isEnabled.mockResolvedValue(true);
  });

  describe('authorization gate', () => {
    const cases: Array<[string, () => Promise<{ success: boolean }>]> = [
      ['getTextToolConfig', () => getTextToolConfig({})],
      ['resolveTextRecipients', () => resolveTextRecipients({}, { mode: 'audience', audienceId: 1 })],
      ['createTextCommunication', () => createTextCommunication(new FormData())],
      ['sendTextChunk', () => sendTextChunk({ communicationId: 900, fromSmsNumberId: 5, body: 'Hi', contactIds: [1] } as never)],
      ['finalizeTextCommunication', () => finalizeTextCommunication(900)],
      ['rewriteTextForSms', () => rewriteTextForSms({ body: 'Hi there', isMms: false })],
    ];

    it.each(cases)('%s refuses a caller without a security role and never touches the service', async (_name, call) => {
      mockRequireSecurityRole.mockRejectedValueOnce(new UnauthorizedError());
      const result = await call();
      expect(result).toEqual({ success: false, error: 'Not authorized' });
      for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
      expect(mockGetSelectionRecordIds).not.toHaveBeenCalled();
      expect(ai.rewriteTextMessage).not.toHaveBeenCalled();
    });

    it('never passes a user id to the service; the service derives it from the gate', async () => {
      await getTextToolConfig({});
      expect(service.listSmsNumbersForUser).toHaveBeenCalledWith();
      expect(service.getUserGlobalFilterCongregationIds).toHaveBeenCalledWith();
      expect(service.getUserTextQuota).toHaveBeenCalledWith();
    });
  });

  describe('getTextToolConfig', () => {
    it('returns numbers, pickers, every campus for an unrestricted user, and merged page tags', async () => {
      service.getMergeTagsForPage.mockResolvedValueOnce(['Group_Name', 'First_Name']);
      const result = await getTextToolConfig({ pageID: 292, s: 55 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.allowedCongregationIds).toEqual([]);
      expect(result.config.congregations.map((c) => c.id)).toEqual([3, 9]);
      expect(result.config.quota).toEqual({ limit: 500, roleNames: ['Staff'] });
      expect(result.config.aiWriterEnabled).toBe(true);
      expect(result.config.timeZone).toBe('America/Phoenix');
      expect(result.config.smsNumbers).toEqual([smsNumber]);
      const tokens = result.config.mergeFields.map((f) => f.token);
      expect(tokens).toContain('Nickname');
      expect(tokens).toContain('Group_Name');
      expect(tokens.filter((t) => t === 'First_Name')).toHaveLength(1);
      expect(result.config.limits.maxAttachmentBytes).toBe(5 * 1024 * 1024);
      expect(result.config.curfew).toBeNull();
    });

    it('includes the domain messaging curfew when one is configured', async () => {
      service.getDomainMessagingData.mockResolvedValueOnce({
        curfew: { start: '19:00', end: '08:00' },
        approvalProcessConfigured: true,
      });
      const result = await getTextToolConfig({});
      expect(result.success && result.config.curfew).toEqual({ start: '19:00', end: '08:00' });
    });

    it('reports whether the domain has a message approval process', async () => {
      service.getDomainMessagingData.mockResolvedValueOnce({ curfew: null, approvalProcessConfigured: false });
      const result = await getTextToolConfig({});
      expect(result.success && result.config.approvalProcessConfigured).toBe(false);
    });

    it('hides the AI writer when the AI service is unconfigured or failing', async () => {
      ai.isEnabled.mockRejectedValueOnce(new Error('no azure'));
      const result = await getTextToolConfig({});
      expect(result.success && result.config.aiWriterEnabled).toBe(false);
    });

    it('limits the campus picker to the global filter for a restricted user', async () => {
      service.getUserGlobalFilterCongregationIds.mockResolvedValueOnce([9, 77]);
      const result = await getTextToolConfig({});
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.config.allowedCongregationIds).toEqual([9, 77]);
      expect(result.config.congregations).toEqual([{ id: 9, label: 'Glendale' }]);
    });

    it('skips the merge-tag proc when there is no selection', async () => {
      await getTextToolConfig({});
      expect(service.getMergeTagsForPage).not.toHaveBeenCalled();
    });

    it('offers the page messaging views for a record or selection launch on a non-Contacts page', async () => {
      service.listMessagingViews.mockResolvedValueOnce([registeredView, { ...registeredView, id: 5, viewTitle: 'Attended', label: 'Participants: Attended' }]);
      const result = await getTextToolConfig(eventParams({ recordID: 79398 }));
      expect(service.listMessagingViews).toHaveBeenCalledWith(308);
      expect(result.success && result.config.messagingViews).toEqual([
        { id: 8, label: 'Participants: Registered', subPageName: 'Participants', viewTitle: 'Registered' },
        { id: 5, label: 'Participants: Attended', subPageName: 'Participants', viewTitle: 'Attended' },
      ]);
    });

    it('offers no messaging views on the Contacts page, without a launch, or when the read fails', async () => {
      const contactsPage = { Page_ID: 292, Display_Name: 'Contacts', Singular_Name: 'Contact', Table_Name: 'Contacts', Primary_Key: 'Contact_ID' };
      expect((await getTextToolConfig({ pageID: 292, s: 55, pageData: contactsPage })) as { config?: { messagingViews: unknown[] } }).toMatchObject({
        config: { messagingViews: [] },
      });
      await getTextToolConfig({});
      expect(service.listMessagingViews).not.toHaveBeenCalled();

      service.listMessagingViews.mockRejectedValueOnce(new Error('no access'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await getTextToolConfig(eventParams({ s: 55 }));
      expect(result.success && result.config.messagingViews).toEqual([]);
      warn.mockRestore();
    });
  });

  describe('resolveTextRecipients', () => {
    it('excludes no-mobile, not-opted-in, off-campus, and duplicate-number contacts for an audience', async () => {
      service.getContactIdsForAudience.mockResolvedValueOnce([1, 2, 3, 4, 5, 5]);
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1),
        contact(2, { Mobile_Phone: null }),
        contact(3, { Texting_Opt_In_Type_ID: 1 }),
        contact(4, { Congregation_ID: 9 }),
        contact(5, { Mobile_Phone: '(602) 555-0001' }),
      ]);
      const result = await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [3] });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.summary).toMatchObject({
        totalContacts: 5,
        excludedByCongregation: 1,
        excludedNoMobile: 1,
        excludedOptedOut: 1,
        excludedDuplicateNumber: 1,
        recipientContactIds: [1],
        usedMessagingView: false,
      });
      expect(result.summary.sampleRecipient?.mergeValues.Nickname).toBe('First1');
      expect(result.summary.sampleRecipient?.mergeValues.Congregation_Name).toBe('Phoenix');
    });

    it('applies the sending number compliance level: double opt-in numbers exclude single opt-ins', async () => {
      service.getSmsNumber.mockResolvedValueOnce({ ...smsNumber, complianceLevelId: 3 });
      service.getContactIdsForAudience.mockResolvedValueOnce([1, 2, 3, 4, 5]);
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1, { Texting_Opt_In_Type_ID: 1 }),
        contact(2, { Texting_Opt_In_Type_ID: 2 }),
        contact(3, { Texting_Opt_In_Type_ID: 3 }),
        contact(4, { Texting_Opt_In_Type_ID: 4 }),
        contact(5, { Texting_Opt_In_Type_ID: null }),
      ]);
      const result = await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [] }, [], 5);
      expect(service.getSmsNumber).toHaveBeenCalledWith(5);
      expect(result.success && result.summary).toMatchObject({
        excludedOptedOut: 4,
        requiresDoubleOptIn: true,
        recipientContactIds: [4],
      });
    });

    it('accepts single and double opt-ins for None and Single Opt-in numbers, and with no number', async () => {
      const rows = () => [
        contact(1, { Texting_Opt_In_Type_ID: 1 }),
        contact(2, { Texting_Opt_In_Type_ID: 2 }),
        contact(3, { Texting_Opt_In_Type_ID: 3 }),
        contact(4, { Texting_Opt_In_Type_ID: 4 }),
      ];
      for (const complianceLevelId of [1, 2, null]) {
        service.getSmsNumber.mockResolvedValueOnce({ ...smsNumber, complianceLevelId });
        service.getContactIdsForAudience.mockResolvedValueOnce([1, 2, 3, 4]);
        service.getTextableContacts.mockResolvedValueOnce(rows());
        const result = await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [] }, [], 5);
        expect(result.success && result.summary).toMatchObject({
          excludedOptedOut: 2,
          requiresDoubleOptIn: false,
          recipientContactIds: [3, 4],
        });
      }

      service.getContactIdsForAudience.mockResolvedValueOnce([1, 2, 3, 4]);
      service.getTextableContacts.mockResolvedValueOnce(rows());
      service.getSmsNumber.mockClear();
      const noNumber = await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [] });
      expect(service.getSmsNumber).not.toHaveBeenCalled();
      expect(noNumber.success && noNumber.summary).toMatchObject({ excludedOptedOut: 2, recipientContactIds: [3, 4] });
    });

    it('fails when the chosen sending number is no longer active', async () => {
      service.getSmsNumber.mockResolvedValueOnce(null);
      service.getContactIdsForAudience.mockResolvedValueOnce([1]);
      expect(await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [] }, [], 5)).toEqual({
        success: false,
        error: 'The sending number is no longer active.',
      });
      expect(service.getTextableContacts).not.toHaveBeenCalled();
    });

    it('normalizes lookalikes in the sample recipient merge values so the preview matches the send', async () => {
      service.getContactIdsForAudience.mockResolvedValueOnce([1]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1, { Nickname: 'D\u2019Andre' })]);
      const result = await resolveTextRecipients({}, { mode: 'audience', audienceId: 8, congregationIds: [] });
      expect(result.success && result.summary.sampleRecipient?.mergeValues.Nickname).toBe("D'Andre");
    });

    it('applies no campus filter for "all my campuses" when the user has no global filter', async () => {
      service.getContactIdsForPublication.mockResolvedValueOnce([1, 4, 6]);
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1),
        contact(4, { Congregation_ID: 9 }),
        contact(6, { Congregation_ID: null }),
      ]);
      const result = await resolveTextRecipients({}, { mode: 'publication', publicationId: 2, congregationIds: [] });
      expect(result.success && result.summary.recipientContactIds).toEqual([1, 4, 6]);
    });

    it('expands "all my campuses" to the global filter set for a restricted user', async () => {
      service.getUserGlobalFilterCongregationIds.mockResolvedValueOnce([3]);
      service.getContactIdsForPublication.mockResolvedValueOnce([1, 4, 6]);
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1),
        contact(4, { Congregation_ID: 9 }),
        contact(6, { Congregation_ID: null }),
      ]);
      const result = await resolveTextRecipients({}, { mode: 'publication', publicationId: 2, congregationIds: [] });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.summary.recipientContactIds).toEqual([1]);
      expect(result.summary.excludedByCongregation).toBe(2);
    });

    it('intersects specific campuses with the global filter and rejects campuses outside it', async () => {
      service.getUserGlobalFilterCongregationIds.mockResolvedValue([3, 9]);
      service.getContactIdsForPublication.mockResolvedValue([1, 4]);
      service.getTextableContacts.mockResolvedValue([contact(1), contact(4, { Congregation_ID: 9 })]);
      const ok = await resolveTextRecipients({}, { mode: 'publication', publicationId: 2, congregationIds: [9, 77] });
      expect(ok.success && ok.summary.recipientContactIds).toEqual([4]);
      const denied = await resolveTextRecipients({}, { mode: 'publication', publicationId: 2, congregationIds: [77] });
      expect(denied).toMatchObject({ success: false, error: expect.stringContaining('global filter') });
    });

    it('resolves a single open record through the chosen messaging view', async () => {
      service.listMessagingViews.mockResolvedValueOnce([registeredView]);
      service.getMessagingViewContacts.mockResolvedValueOnce([160930, 288345]);
      service.getTextableContacts.mockResolvedValueOnce([contact(160930), contact(288345)]);
      const result = await resolveTextRecipients(eventParams({ recordID: 79398 }), { mode: 'record', messagingViewId: 8 });
      expect(service.listMessagingViews).toHaveBeenCalledWith(308);
      expect(service.getMessagingViewContacts).toHaveBeenCalledWith(registeredView, [79398], '2026-09-16 10:00:00');
      expect(mockGetSelectionRecordIds).not.toHaveBeenCalled();
      expect(service.getSelectedContacts).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.summary.recipientContactIds).toEqual([160930, 288345]);
      expect(result.summary.usedMessagingView).toBe(true);
    });

    it('resolves a selection through the chosen messaging view using the selection record IDs', async () => {
      service.listMessagingViews.mockResolvedValueOnce([registeredView]);
      mockGetSelectionRecordIds.mockResolvedValueOnce([79398, 79399]);
      service.getMessagingViewContacts.mockResolvedValueOnce([1]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1)]);
      const result = await resolveTextRecipients(eventParams({ s: 55 }), { mode: 'selection', messagingViewId: 8 });
      expect(mockGetSelectionRecordIds).toHaveBeenCalledWith(55, 308);
      expect(service.getMessagingViewContacts).toHaveBeenCalledWith(registeredView, [79398, 79399], '2026-09-16 10:00:00');
      expect(service.getSelectedContacts).not.toHaveBeenCalled();
      expect(result.success && result.summary.recipientContactIds).toEqual([1]);
    });

    it('rejects a messaging view that is not on the launching page', async () => {
      service.listMessagingViews.mockResolvedValueOnce([registeredView]);
      const result = await resolveTextRecipients(eventParams({ recordID: 79398 }), { mode: 'record', messagingViewId: 999 });
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('not available') });
      expect(service.getMessagingViewContacts).not.toHaveBeenCalled();
    });

    it('falls back to the Contact_ID_Field mapping for a record launch without a messaging view', async () => {
      mockResolveContactIds.mockResolvedValueOnce({ records: [{ recordId: 79398, contactId: 7 }] });
      service.getTextableContacts.mockResolvedValueOnce([contact(7)]);
      const result = await resolveTextRecipients(eventParams({ recordID: 79398 }), { mode: 'record' });
      expect(service.getSelectedContacts).not.toHaveBeenCalled();
      expect(mockResolveContactIds).toHaveBeenCalledWith('Events', 'Event_ID', 'Events.Primary_Contact', [79398]);
      expect(result.success && result.summary.recipientContactIds).toEqual([7]);
    });

    it('errors for record mode without a record', async () => {
      const result = await resolveTextRecipients(eventParams({}), { mode: 'record' });
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('not launched from a record') });
    });

    it('uses the selection record IDs directly on the Contacts page', async () => {
      const params: ToolParams = {
        pageID: 292,
        s: 55,
        pageData: { Page_ID: 292, Display_Name: 'Contacts', Singular_Name: 'Contact', Table_Name: 'Contacts', Primary_Key: 'Contact_ID' },
      };
      mockGetSelectionRecordIds.mockResolvedValueOnce([1, 2]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1), contact(2)]);
      const result = await resolveTextRecipients(params, { mode: 'selection' });
      expect(mockGetSelectionRecordIds).toHaveBeenCalledWith(55, 292);
      expect(service.getSelectedContacts).not.toHaveBeenCalled();
      expect(result.success && result.summary.recipientContactIds).toEqual([1, 2]);
    });

    it('uses the messaging-view proc for other pages and carries page merge values', async () => {
      const params: ToolParams = {
        pageID: 322,
        s: 55,
        pageData: { Page_ID: 322, Display_Name: 'Groups', Singular_Name: 'Group', Table_Name: 'Groups', Primary_Key: 'Group_ID' },
      };
      service.getSelectedContacts.mockResolvedValueOnce([{ Contact_ID: 1, Group_Name: 'Alpha' }]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1)]);
      const result = await resolveTextRecipients(params, { mode: 'selection' }, ['Nickname', 'Group_Name']);
      expect(service.getSelectedContacts).toHaveBeenCalledWith(55, ['Group_Name']);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.summary.usedMessagingView).toBe(true);
      expect(result.summary.sampleRecipient?.mergeValues.Group_Name).toBe('Alpha');
    });

    it('falls back to the Contact_ID_Field mapping when the proc is unavailable', async () => {
      const params: ToolParams = {
        pageID: 322,
        s: 55,
        pageData: {
          Page_ID: 322,
          Display_Name: 'Group Participants',
          Singular_Name: 'Group Participant',
          Table_Name: 'Group_Participants',
          Primary_Key: 'Group_Participant_ID',
          Contact_ID_Field: 'Participant_ID_Table.Contact_ID',
        },
      };
      service.getSelectedContacts.mockResolvedValueOnce(null);
      mockGetSelectionRecordIds.mockResolvedValueOnce([500]);
      mockResolveContactIds.mockResolvedValueOnce({ records: [{ recordId: 500, contactId: 1 }] });
      service.getTextableContacts.mockResolvedValueOnce([contact(1)]);
      const result = await resolveTextRecipients(params, { mode: 'selection' });
      expect(mockResolveContactIds).toHaveBeenCalledWith('Group_Participants', 'Group_Participant_ID', 'Participant_ID_Table.Contact_ID', [500]);
      expect(result.success && result.summary.recipientContactIds).toEqual([1]);
    });

    it('errors when a non-contact page has neither a messaging view nor a contact field', async () => {
      const params: ToolParams = {
        pageID: 1,
        s: 55,
        pageData: { Page_ID: 1, Display_Name: 'Events', Singular_Name: 'Event', Table_Name: 'Events', Primary_Key: 'Event_ID' },
      };
      service.getSelectedContacts.mockResolvedValueOnce(null);
      const result = await resolveTextRecipients(params, { mode: 'selection' });
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('cannot be mapped to contacts') });
    });

    it('errors without a selection or without an audience id', async () => {
      expect(await resolveTextRecipients({}, { mode: 'selection' })).toMatchObject({ success: false });
      expect(await resolveTextRecipients({}, { mode: 'audience' })).toEqual({ success: false, error: 'Choose an audience.' });
    });
  });

  describe('createTextCommunication', () => {
    function form(payload: Record<string, unknown>, file?: File) {
      const fd = new FormData();
      fd.append('payload', JSON.stringify(payload));
      if (file) fd.append('attachment', file, file.name);
      return fd;
    }

    it('creates a Draft text communication from the sender and uploads the attachment', async () => {
      service.createCommunication.mockResolvedValueOnce(900);
      service.attachFile.mockResolvedValueOnce(77);
      const file = new File(['img'], 'pic.jpg', { type: 'image/jpeg' });
      const result = await createTextCommunication(
        form(
          {
            body: '  Hi [Nickname]  ',
            fromSmsNumberId: 5,
            target: { mode: 'selection' },
            recipientCount: 2,
            pageId: 292,
            selectionId: 55,
          },
          file
        )
      );
      expect(result).toEqual({
        success: true,
        communicationId: 900,
        attachmentFileId: 77,
        startDate: '2026-09-16 10:00:00',
      });
      expect(mockToMpSqlDatetime).toHaveBeenCalledWith(expect.any(Date));
      const row = service.createCommunication.mock.calls[0][0];
      expect(row).not.toHaveProperty('Author_User_ID');
      expect(row).toMatchObject({
        Communication_Type_ID: 2,
        Communication_Status_ID: 1,
        Selection_ID: 55,
        Pertains_To_Page_ID: 292,
        From_SMS_Number: 5,
        From_Contact: 7,
        Reply_to_Contact: 7,
        Subject: 'Hi [Nickname]',
        Body: 'Hi [Nickname]',
        Start_Date: '2026-09-16 10:00:00',
        Publication_ID: null,
      });
      expect(service.attachFile).toHaveBeenCalledWith(900, expect.any(File));
    });

    it('records the publication and no selection for publication sends', async () => {
      service.createCommunication.mockResolvedValueOnce(901);
      await createTextCommunication(
        form({ body: 'Hi', fromSmsNumberId: 5, target: { mode: 'publication', publicationId: 12 }, recipientCount: 1, selectionId: 55 })
      );
      expect(service.createCommunication.mock.calls[0][0]).toMatchObject({ Publication_ID: 12, Selection_ID: null });
      expect(service.attachFile).not.toHaveBeenCalled();
    });

    it('writes a scheduled Start_Date as domain wall-clock time', async () => {
      service.createCommunication.mockResolvedValueOnce(902);
      mockToMpSqlDatetime.mockResolvedValueOnce('2099-01-05 09:30:00');
      const result = await createTextCommunication(
        form({
          body: 'Hi',
          fromSmsNumberId: 5,
          target: { mode: 'audience', audienceId: 1 },
          recipientCount: 1,
          scheduledLocal: '2099-01-05T09:30',
        })
      );
      expect(result).toMatchObject({ success: true, startDate: '2099-01-05 09:30:00' });
      expect(mockToMpSqlDatetime).toHaveBeenCalledWith('2099-01-05T09:30');
      expect(service.createCommunication.mock.calls[0][0]).toMatchObject({ Start_Date: '2099-01-05 09:30:00' });
    });

    it('rejects a scheduled time in the past or in an unexpected format', async () => {
      mockToMpSqlDatetime.mockResolvedValueOnce('2020-01-05 09:30:00');
      expect(
        await createTextCommunication(
          form({ body: 'Hi', fromSmsNumberId: 5, target: { mode: 'audience', audienceId: 1 }, recipientCount: 1, scheduledLocal: '2020-01-05T09:30' })
        )
      ).toMatchObject({ success: false, error: expect.stringContaining('already passed') });

      expect(
        await createTextCommunication(
          form({ body: 'Hi', fromSmsNumberId: 5, target: { mode: 'audience', audienceId: 1 }, recipientCount: 1, scheduledLocal: 'tomorrow 9am' })
        )
      ).toMatchObject({ success: false, error: expect.stringContaining('not valid') });
      expect(service.createCommunication).not.toHaveBeenCalled();
    });

    it('rejects numbers the user cannot use, empty bodies, and oversized attachments', async () => {
      service.listSmsNumbersForUser.mockResolvedValueOnce([]);
      expect(
        await createTextCommunication(form({ body: 'Hi', fromSmsNumberId: 5, target: { mode: 'audience', audienceId: 1 }, recipientCount: 1 }))
      ).toMatchObject({ success: false, error: expect.stringContaining('do not have access') });

      expect(
        await createTextCommunication(form({ body: '   ', fromSmsNumberId: 5, target: { mode: 'audience', audienceId: 1 }, recipientCount: 1 }))
      ).toEqual({ success: false, error: 'Enter a message.' });

      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
      expect(
        await createTextCommunication(form({ body: 'Hi', fromSmsNumberId: 5, target: { mode: 'audience', audienceId: 1 }, recipientCount: 1 }, big))
      ).toMatchObject({ success: false, error: expect.stringContaining('5 MB') });
      expect(service.createCommunication).not.toHaveBeenCalled();
    });
  });

  describe('sendTextChunk', () => {
    it('merges placeholders per contact, skips ineligible contacts, and inserts message rows', async () => {
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1, { Nickname: 'Sam' }),
        contact(2, { Texting_Opt_In_Type_ID: 2 }),
        contact(3, { Mobile_Phone: '' }),
      ]);
      const result = await sendTextChunk({
        communicationId: 900,
        contactIds: [1, 2, 3, 4],
        body: 'Hi [Nickname], see you at [Congregation_Name]',
        fromSmsNumberId: 5,
      });
      expect(result).toEqual({ success: true, createdCount: 1, skippedCount: 3 });
      const rows = service.createMessages.mock.calls[0][0];
      expect(rows).toEqual([
        {
          Communication_ID: 900,
          Action_Status_ID: 2,
          Action_Status_Time: '2026-09-16 10:00:00',
          Contact_ID: 1,
          From: '+16025550100',
          To: '6025550001',
          Subject: 'Hi Sam, see you at Phoenix',
          Body: 'Hi Sam, see you at Phoenix',
          Deleted: false,
        },
      ]);
      expect(service.getSelectedContacts).not.toHaveBeenCalled();
    });

    it('skips single opt-in contacts when the sending number requires double opt-in', async () => {
      service.getSmsNumber.mockResolvedValueOnce({ ...smsNumber, complianceLevelId: 3 });
      service.getTextableContacts.mockResolvedValueOnce([
        contact(1, { Texting_Opt_In_Type_ID: 3 }),
        contact(2, { Texting_Opt_In_Type_ID: 4 }),
      ]);
      const result = await sendTextChunk({ communicationId: 900, contactIds: [1, 2], body: 'Hi', fromSmsNumberId: 5 });
      expect(result).toEqual({ success: true, createdCount: 1, skippedCount: 1 });
      expect(service.createMessages.mock.calls[0][0].map((r: { Contact_ID: number }) => r.Contact_ID)).toEqual([2]);
    });

    it('normalizes lookalike characters in merge values and the merged body at send time', async () => {
      service.getSelectedContacts.mockResolvedValueOnce([{ Contact_ID: 1, Group_Name: 'Men\u2019s \u201CIron\u201D Group' }]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1, { Nickname: 'D\u2019Andre' })]);
      await sendTextChunk({
        communicationId: 900,
        contactIds: [1],
        body: '[Nickname] \u2014 [Group_Name] meets tonight\u2026',
        fromSmsNumberId: 5,
        selectionId: 55,
      });
      expect(service.createMessages.mock.calls[0][0][0].Body).toBe("D'Andre - Men's \"Iron\" Group meets tonight...");
    });

    it('pulls page merge tags from the messaging view when the body uses them', async () => {
      service.getSelectedContacts.mockResolvedValueOnce([{ Contact_ID: 1, Group_Name: 'Alpha' }]);
      service.getTextableContacts.mockResolvedValueOnce([contact(1)]);
      await sendTextChunk({ communicationId: 900, contactIds: [1], body: '[Group_Name] meets [Nickname]', fromSmsNumberId: 5, selectionId: 55 });
      expect(service.getSelectedContacts).toHaveBeenCalledWith(55, ['Group_Name']);
      expect(service.createMessages.mock.calls[0][0][0].Body).toBe('Alpha meets First1');
    });

    it('uses the number title as From when the row has no number and enforces chunk size', async () => {
      service.getSmsNumber.mockResolvedValueOnce({ ...smsNumber, number: null });
      service.getTextableContacts.mockResolvedValueOnce([contact(1)]);
      await sendTextChunk({ communicationId: 900, contactIds: [1], body: 'Hi', fromSmsNumberId: 5 });
      expect(service.createMessages.mock.calls[0][0][0].From).toBe('Main');

      const tooMany = Array.from({ length: 201 }, (_, i) => i + 1);
      expect(await sendTextChunk({ communicationId: 900, contactIds: tooMany, body: 'Hi', fromSmsNumberId: 5 })).toMatchObject({
        success: false,
        error: expect.stringContaining('200'),
      });
    });

    it('returns zero for an empty chunk without touching MP', async () => {
      expect(await sendTextChunk({ communicationId: 900, contactIds: [], body: 'Hi', fromSmsNumberId: 5 })).toEqual({
        success: true,
        createdCount: 0,
        skippedCount: 0,
      });
      expect(service.getTextableContacts).not.toHaveBeenCalled();
    });
  });

  describe('finalizeTextCommunication', () => {
    it('moves to Ready to Send (3) when the message count is within the quota', async () => {
      service.countMessages.mockResolvedValueOnce(500);
      service.setCommunicationStatus.mockResolvedValueOnce(undefined);
      expect(await finalizeTextCommunication(900)).toEqual({
        success: true,
        communicationId: 900,
        outcome: 'ready_to_send',
        messageCount: 500,
        quotaLimit: 500,
      });
      expect(service.setCommunicationStatus).toHaveBeenCalledWith(900, 3);
    });

    it('moves to In Review (2) when the message count exceeds the quota', async () => {
      service.countMessages.mockResolvedValueOnce(501);
      service.setCommunicationStatus.mockResolvedValueOnce(undefined);
      const result = await finalizeTextCommunication(900);
      expect(result).toMatchObject({ success: true, outcome: 'in_review', messageCount: 501, quotaLimit: 500 });
      expect(service.setCommunicationStatus).toHaveBeenCalledWith(900, 2);
    });

    it('moves to In Review when no role grants a quota, however small the send', async () => {
      service.getUserTextQuota.mockResolvedValueOnce({ limit: null, roleNames: [] });
      service.countMessages.mockResolvedValueOnce(1);
      service.setCommunicationStatus.mockResolvedValueOnce(undefined);
      const result = await finalizeTextCommunication(900);
      expect(result).toMatchObject({ success: true, outcome: 'in_review', quotaLimit: null });
      expect(service.setCommunicationStatus).toHaveBeenCalledWith(900, 2);
    });

    it('refuses to release an over-quota send when the domain has no approval process', async () => {
      service.getDomainMessagingData.mockResolvedValueOnce({ curfew: null, approvalProcessConfigured: false });
      service.countMessages.mockResolvedValueOnce(501);
      const result = await finalizeTextCommunication(900);
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('over your limit of 500') });
      expect(service.setCommunicationStatus).not.toHaveBeenCalled();
    });

    it('refuses to release when the sender has no quota and the domain has no approval process', async () => {
      service.getDomainMessagingData.mockResolvedValueOnce({ curfew: null, approvalProcessConfigured: false });
      service.getUserTextQuota.mockResolvedValueOnce({ limit: null, roleNames: [] });
      service.countMessages.mockResolvedValueOnce(1);
      const result = await finalizeTextCommunication(900);
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('approval process') });
      expect(service.setCommunicationStatus).not.toHaveBeenCalled();
    });

    it('still releases a within-quota send when the domain has no approval process', async () => {
      service.getDomainMessagingData.mockResolvedValueOnce({ curfew: null, approvalProcessConfigured: false });
      service.countMessages.mockResolvedValueOnce(500);
      service.setCommunicationStatus.mockResolvedValueOnce(undefined);
      const result = await finalizeTextCommunication(900);
      expect(result).toMatchObject({ success: true, outcome: 'ready_to_send' });
      expect(service.setCommunicationStatus).toHaveBeenCalledWith(900, 3);
    });

    it('refuses to release a communication with no message rows', async () => {
      service.countMessages.mockResolvedValueOnce(0);
      expect(await finalizeTextCommunication(900)).toMatchObject({ success: false, error: expect.stringContaining('No messages') });
      expect(service.setCommunicationStatus).not.toHaveBeenCalled();
    });

    it('reports failures', async () => {
      service.countMessages.mockResolvedValueOnce(5);
      service.setCommunicationStatus.mockRejectedValueOnce(new Error('boom'));
      expect(await finalizeTextCommunication(900)).toEqual({ success: false, error: 'boom' });
    });
  });

  describe('rewriteTextForSms', () => {
    it('passes the analysis to the AI service and returns a GSM-safe result with kept placeholders', async () => {
      ai.rewriteTextMessage.mockResolvedValueOnce('\u201CHi [Nickname] \u2014 see you Sunday at 9am\u201D');
      const result = await rewriteTextForSms({
        body: 'Hi [Nickname] \u2014 just a quick reminder that service is at 9am on Sunday!',
        isMms: false,
      });
      expect(result).toEqual({
        success: true,
        text: 'Hi [Nickname] - see you Sunday at 9am',
        placeholdersDropped: [],
        gsmFixed: true,
      });
      const input = ai.rewriteTextMessage.mock.calls[0][0];
      expect(input).toMatchObject({
        placeholders: ['Nickname'],
        currentEncoding: 'UCS-2',
        nonGsmCharacters: ['\u2014'],
        isMms: false,
      });
    });

    it('reports placeholders the model dropped', async () => {
      ai.rewriteTextMessage.mockResolvedValueOnce('See you Sunday at 9am, [Nickname]!');
      const result = await rewriteTextForSms({ body: 'Hi [Nickname] from [Congregation_Name], see you Sunday!', isMms: true });
      expect(result).toMatchObject({ success: true, placeholdersDropped: ['Congregation_Name'], gsmFixed: false });
    });

    it('rejects an empty draft and surfaces AI failures', async () => {
      expect(await rewriteTextForSms({ body: '   ', isMms: false })).toMatchObject({
        success: false,
        error: expect.stringContaining('Write a message first'),
      });
      ai.rewriteTextMessage.mockResolvedValueOnce('😀');
      expect(await rewriteTextForSms({ body: 'Hi', isMms: false })).toMatchObject({
        success: false,
        error: expect.stringContaining('came back empty'),
      });
      ai.rewriteTextMessage.mockRejectedValueOnce(new Error('AI writing is not configured.'));
      expect(await rewriteTextForSms({ body: 'Hi', isMms: false })).toEqual({
        success: false,
        error: 'AI writing is not configured.',
      });
    });
  });
});

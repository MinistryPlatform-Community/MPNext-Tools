import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetTableRecords,
  mockCreateTableRecords,
  mockUpdateTableRecords,
  mockUploadFiles,
  mockExecuteProcedureWithBody,
  mockExecuteProcedure,
} = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
  mockCreateTableRecords: vi.fn(),
  mockUpdateTableRecords: vi.fn(),
  mockUploadFiles: vi.fn(),
  mockExecuteProcedureWithBody: vi.fn(),
  mockExecuteProcedure: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
    updateTableRecords = mockUpdateTableRecords;
    uploadFiles = mockUploadFiles;
    executeProcedureWithBody = mockExecuteProcedureWithBody;
    executeProcedure = mockExecuteProcedure;
  },
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

import {
  TextMessageService,
  textCommunicationInsertSchema,
  textMessageInsertSchema,
  type TextCommunicationInsert,
  type TextMessageInsert,
} from './textMessageService';

function communicationRow(overrides: Partial<TextCommunicationInsert> = {}): TextCommunicationInsert {
  return {
    Author_User_ID: 42,
    Communication_Type_ID: 2,
    Communication_Status_ID: 1,
    Selection_ID: null,
    Send_To_Parents: false,
    Subject: 'Hi',
    Body: 'Hi [Nickname]',
    Pertains_To_Page_ID: null,
    From_SMS_Number: 3,
    From_Contact: 7,
    Reply_to_Contact: 7,
    Start_Date: '2026-09-16 10:00:00',
    Bulk_Email: false,
    Template: false,
    Active: true,
    Publication_ID: null,
    ...overrides,
  };
}

function messageRow(overrides: Partial<TextMessageInsert> = {}): TextMessageInsert {
  return {
    Communication_ID: 900,
    Action_Status_ID: 2,
    Action_Status_Time: '2026-09-16 10:00:00',
    Contact_ID: 11,
    From: '+16025550100',
    To: '(602) 555-0142',
    Subject: null,
    Body: 'Hi Sam',
    Deleted: false,
    ...overrides,
  };
}

describe('TextMessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
    (TextMessageService as unknown as { instance: unknown }).instance = undefined;
  });

  it('returns a singleton', async () => {
    const a = await TextMessageService.getInstance();
    const b = await TextMessageService.getInstance();
    expect(a).toBe(b);
  });

  describe('getSenderContext', () => {
    it('reads the contact for the user', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ User_ID: 42, Contact_ID: 7, Display_Name: 'Staff, Sam' }]);
      const service = await TextMessageService.getInstance();
      const ctx = await service.getSenderContext();
      expect(ctx).toEqual({ userId: 42, contactId: 7, displayName: 'Staff, Sam' });
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'dp_Users', filter: 'dp_Users.User_ID = 42' })
      );
    });

    it('throws when the user is missing', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await TextMessageService.getInstance();
      await expect(service.getSenderContext()).rejects.toThrow('User not found');
    });
  });

  describe('getUserTextQuota', () => {
    it('takes the highest Mass_Text_Quota across the user roles', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Role_Name: 'Staff', Mass_Text_Quota: 500 },
        { Role_Name: 'Campus Pastors', Mass_Text_Quota: 2000 },
        { Role_Name: 'Volunteers', Mass_Text_Quota: null },
        { Role_Name: 'Zero', Mass_Text_Quota: 0 },
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getUserTextQuota()).toEqual({ limit: 2000, roleNames: ['Staff', 'Campus Pastors'] });
      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'dp_User_Roles',
        select: 'Role_ID_TABLE.Role_Name, Role_ID_TABLE.Mass_Text_Quota',
        filter: 'dp_User_Roles.User_ID = 42',
      });
    });

    it('returns a null limit when no role carries a quota', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Role_Name: 'Volunteers', Mass_Text_Quota: null }]);
      const service = await TextMessageService.getInstance();
      expect(await service.getUserTextQuota()).toEqual({ limit: null, roleNames: [] });
    });
  });

  describe('getDomainMessagingData', () => {
    it('reads and normalizes the curfew times and the approval process from api_CORE_GetDomainData', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([
        [
          {
            Application_Title: 'DCC',
            Message_Curfew_Start_Time: '19:00:00',
            Message_Curfew_End_Time: '08:00:00',
            Messaging_Approval_Process_ID: 4,
          },
        ],
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({
        curfew: { start: '19:00', end: '08:00' },
        approvalProcessConfigured: true,
      });
      expect(mockExecuteProcedure).toHaveBeenCalledWith('api_CORE_GetDomainData');
    });

    it('reports no approval process when Messaging_Approval_Process_ID is null', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([
        [{ Message_Curfew_Start_Time: '19:00:00', Message_Curfew_End_Time: '08:00:00', Messaging_Approval_Process_ID: null }],
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({
        curfew: { start: '19:00', end: '08:00' },
        approvalProcessConfigured: false,
      });
    });

    it('keeps the approval process open when the column is absent', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([
        [{ Message_Curfew_Start_Time: '19:00:00', Message_Curfew_End_Time: '08:00:00' }],
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({
        curfew: { start: '19:00', end: '08:00' },
        approvalProcessConfigured: true,
      });
    });

    it('returns a null curfew when either curfew time is missing', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([
        [{ Message_Curfew_Start_Time: '19:00:00', Message_Curfew_End_Time: null, Messaging_Approval_Process_ID: 4 }],
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({ curfew: null, approvalProcessConfigured: true });
    });

    it('keeps the review path open when the proc is unavailable', async () => {
      mockExecuteProcedure.mockRejectedValueOnce(new Error('403 Forbidden'));
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({ curfew: null, approvalProcessConfigured: true });
    });
  });

  describe('countMessages', () => {
    it('counts non-deleted message rows, paging past 1000', async () => {
      mockGetTableRecords
        .mockResolvedValueOnce(Array.from({ length: 1000 }, (_, i) => ({ Communication_Message_ID: i + 1 })))
        .mockResolvedValueOnce([{ Communication_Message_ID: 1001 }]);
      const service = await TextMessageService.getInstance();
      expect(await service.countMessages(900)).toBe(1001);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      expect(mockGetTableRecords.mock.calls[0][0]).toMatchObject({
        table: 'dp_Communication_Messages',
        filter: 'Communication_ID = 900 AND Deleted = 0',
        top: 1000,
        skip: 0,
      });
      expect(mockGetTableRecords.mock.calls[1][0]).toMatchObject({ skip: 1000 });
    });
  });

  describe('getUserGlobalFilterCongregationIds', () => {
    it('returns the distinct congregation ids from dp_User_Global_Filters', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Global_Filter_ID: 3 },
        { Global_Filter_ID: '5' },
        { Global_Filter_ID: 3 },
        { Global_Filter_ID: null },
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getUserGlobalFilterCongregationIds()).toEqual([3, 5]);
      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'dp_User_Global_Filters',
        select: 'Global_Filter_ID',
        filter: 'User_ID = 42',
      });
    });

    it('returns [] when the user has no global filter rows', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await TextMessageService.getInstance();
      expect(await service.getUserGlobalFilterCongregationIds()).toEqual([]);
    });
  });

  describe('listCongregations', () => {
    it('lists live online campuses in online sort order', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Congregation_ID: 3, Congregation_Name: 'Phoenix' }]);
      const service = await TextMessageService.getInstance();
      expect(await service.listCongregations()).toEqual([{ id: 3, label: 'Phoenix' }]);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Congregations',
          filter: 'End_Date IS NULL AND Available_Online = 1',
          orderBy: 'Online_Sort_Order, Congregation_Name',
        })
      );
    });
  });

  describe('listSmsNumbersForUser', () => {
    it('keeps ungrouped numbers and those in the user groups, default first', async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([
          { SMS_Number_ID: 1, Number_Title: 'Zeta Line', SMS_Number: '+1600', Default: false, User_Group_ID: null, Congregation_ID: null, Cost_Per_Segment: 0.0079, Sender_Label: null, Texting_Compliance_Level: 3 },
          { SMS_Number_ID: 2, Number_Title: 'Main', SMS_Number: '+1601', Default: true, User_Group_ID: 9, Congregation_ID: 3, Cost_Per_Segment: null, Sender_Label: 'Dream City', Texting_Compliance_Level: 1 },
          { SMS_Number_ID: 3, Number_Title: 'Private', SMS_Number: '+1602', Default: false, User_Group_ID: 77, Congregation_ID: null, Cost_Per_Segment: null, Sender_Label: null, Texting_Compliance_Level: null },
        ])
        .mockResolvedValueOnce([{ User_Group_ID: 9 }]);
      const service = await TextMessageService.getInstance();
      const numbers = await service.listSmsNumbersForUser();
      expect(numbers.map((n) => n.id)).toEqual([2, 1]);
      expect(numbers[0]).toMatchObject({ isDefault: true, senderLabel: 'Dream City', congregationId: 3, costPerSegment: null, complianceLevelId: 1 });
      expect(numbers[1].complianceLevelId).toBe(3);
      expect(mockGetTableRecords.mock.calls[0][0].select).toContain('Texting_Compliance_Level');
      expect(numbers[1].costPerSegment).toBe(0.0079);
    });
  });

  describe('getTextCommunicationTypeId', () => {
    it('resolves the type by name and caches it', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Communication_Type_ID: 5, Communication_Type: 'Text Message' }]);
      const service = await TextMessageService.getInstance();
      expect(await service.getTextCommunicationTypeId()).toBe(5);
      expect(await service.getTextCommunicationTypeId()).toBe(5);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
    });

    it('falls back to the configured ID when the lookup fails', async () => {
      mockGetTableRecords.mockRejectedValueOnce(new Error('no access'));
      const service = await TextMessageService.getInstance();
      expect(await service.getTextCommunicationTypeId()).toBe(2);
    });
  });

  describe('getSelectedContacts', () => {
    it('returns rows from the result set that carries Contact_ID', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([
        [{ Count: 2 }],
        [
          { Contact_ID: 11, Group_Name: 'Alpha' },
          { Contact_ID: 12, Group_Name: 'Beta' },
        ],
      ]);
      const service = await TextMessageService.getInstance();
      const rows = await service.getSelectedContacts(55, ['Group_Name', 'bad field', 'Contact_ID']);
      expect(rows).toEqual([
        { Contact_ID: 11, Group_Name: 'Alpha' },
        { Contact_ID: 12, Group_Name: 'Beta' },
      ]);
      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_Tools_GetSelectedContacts', {
        '@SelectionId': 55,
        '@SelectFields': 'Contact_ID,Group_Name',
      });
    });

    it('returns [] for an empty selection and null when the proc fails or has no usable set', async () => {
      const service = await TextMessageService.getInstance();
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);
      expect(await service.getSelectedContacts(55)).toEqual([]);
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[{ Something: 1 }]]);
      expect(await service.getSelectedContacts(55)).toBeNull();
      mockExecuteProcedureWithBody.mockRejectedValueOnce(new Error('denied'));
      expect(await service.getSelectedContacts(55)).toBeNull();
    });
  });

  describe('listMessagingViews', () => {
    it('reads flagged sub-page views for the page through FK traversal and maps them', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        {
          Sub_Page_View_ID: 8,
          View_Title: 'Registered',
          View_Clause: ' Event_Participants.Participation_Status_ID = 2 ',
          Sub_Page_Name: 'Participants',
          View_Order: 1,
          Table_Name: 'Event_Participants',
          Primary_Key: 'Event_Participant_ID',
          Contact_ID_Field: 'Participant_ID_Table.Contact_ID',
          Parent_Primary_Key: 'Event_ID',
        },
        {
          Sub_Page_View_ID: 9,
          View_Title: 'Broken',
          View_Clause: null,
          Sub_Page_Name: 'Notes',
          View_Order: 2,
          Table_Name: 'Event_Notes',
          Primary_Key: 'Event_Note_ID',
          Contact_ID_Field: null,
          Parent_Primary_Key: 'Event_ID',
        },
      ]);
      const service = await TextMessageService.getInstance();
      const views = await service.listMessagingViews(308);
      expect(views).toEqual([
        {
          id: 8,
          viewTitle: 'Registered',
          subPageName: 'Participants',
          label: 'Participants: Registered',
          tableName: 'Event_Participants',
          primaryKey: 'Event_Participant_ID',
          contactIdField: 'Participant_ID_Table.Contact_ID',
          parentKey: 'Event_ID',
          viewClause: 'Event_Participants.Participation_Status_ID = 2',
        },
      ]);
      const call = mockGetTableRecords.mock.calls[0][0];
      expect(call.table).toBe('dp_Sub_Page_Views');
      expect(call.filter).toBe(
        'dp_Sub_Page_Views.Messaging_View = 1 AND Sub_Page_ID_TABLE.Parent_Page_ID = 308 AND (dp_Sub_Page_Views.User_ID IS NULL OR dp_Sub_Page_Views.User_ID = 42)'
      );
      expect(call.select).toContain('Sub_Page_ID_TABLE_Target_Page_ID_TABLE.Contact_ID_Field');
      expect(call.select).toContain('Sub_Page_ID_TABLE_Parent_Page_ID_TABLE.Primary_Key AS Parent_Primary_Key');
    });
  });

  describe('getMessagingViewContacts', () => {
    const view = {
      id: 8,
      label: 'Participants: Registered',
      subPageName: 'Participants',
      viewTitle: 'Registered',
      tableName: 'Event_Participants',
      primaryKey: 'Event_Participant_ID',
      contactIdField: 'Participant_ID_Table.Contact_ID',
      parentKey: 'Event_ID',
      viewClause: 'Event_Participants.Participation_Status_ID = 2 AND Event_Participants._Setup_Date < dp_DomainTime',
    };

    it('queries the view table scoped to the parent records with the clause and domain time applied', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Contact_ID: 11 }, { Contact_ID: 12 }, { Contact_ID: 11 }, { Contact_ID: null }]);
      const service = await TextMessageService.getInstance();
      const ids = await service.getMessagingViewContacts(view, [79398, 79398, 79399], '2026-09-16 10:00:00');
      expect(ids).toEqual([11, 12]);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      const call = mockGetTableRecords.mock.calls[0][0];
      expect(call.table).toBe('Event_Participants');
      expect(call.select).toBe('Participant_ID_Table.Contact_ID AS Contact_ID');
      expect(call.filter).toBe(
        "Event_Participants.Event_ID IN (79398,79399) AND (Event_Participants.Participation_Status_ID = 2 AND Event_Participants._Setup_Date < '2026-09-16 10:00:00')"
      );
      expect(call.distinct).toBe(true);
    });

    it('omits the clause wrapper for an unrestricted view and batches parent ids', async () => {
      mockGetTableRecords.mockResolvedValue([]);
      const service = await TextMessageService.getInstance();
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      await service.getMessagingViewContacts({ ...view, viewClause: '' }, ids, '2026-09-16 10:00:00');
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      expect(mockGetTableRecords.mock.calls[0][0].filter).toMatch(/^Event_Participants\.Event_ID IN \(1,2,/);
      expect(mockGetTableRecords.mock.calls[0][0].filter).not.toContain(' AND (');
    });

    it('rejects unsafe identifiers and a malformed domain time', async () => {
      const service = await TextMessageService.getInstance();
      await expect(
        service.getMessagingViewContacts({ ...view, tableName: 'Events; DROP' }, [1], '2026-09-16 10:00:00')
      ).rejects.toThrow(/Invalid column name/);
      await expect(service.getMessagingViewContacts(view, [1], 'now')).rejects.toThrow(/domain time/);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('getMergeTagsForPage', () => {
    it('collects bracketed or bare column-like strings and ignores failures', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([
        [{ Tag: '[Group_Name]' }, { Tag: 'Meeting_Day' }, { Tag: 'not a tag' }, { Tag: 42 }],
      ]);
      const service = await TextMessageService.getInstance();
      expect(await service.getMergeTagsForPage(292)).toEqual(['Group_Name', 'Meeting_Day']);
      mockExecuteProcedureWithBody.mockRejectedValueOnce(new Error('denied'));
      expect(await service.getMergeTagsForPage(292)).toEqual([]);
    });
  });

  describe('getTextableContacts', () => {
    it('dedupes ids and batches by 100 with table-prefixed Contact_ID', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      mockGetTableRecords.mockResolvedValue([]);
      const service = await TextMessageService.getInstance();
      await service.getTextableContacts([...ids, 1, 2]);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      const firstFilter = mockGetTableRecords.mock.calls[0][0].filter as string;
      expect(firstFilter.startsWith('Contacts.Contact_ID IN (1,2,3')).toBe(true);
      expect(mockGetTableRecords.mock.calls[0][0].select).toContain('Contacts.Texting_Opt_In_Type_ID');
      expect(mockGetTableRecords.mock.calls[0][0].select).not.toContain('Do_Not_Text');
    });
  });

  describe('writes', () => {
    it('createCommunication validates, requests the ID back, and returns it', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{ Communication_ID: 900 }]);
      const service = await TextMessageService.getInstance();
      const id = await service.createCommunication(communicationRow());
      expect(id).toBe(900);
      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'dp_Communications',
        [communicationRow()],
        expect.objectContaining({ schema: textCommunicationInsertSchema, $select: 'Communication_ID', $userId: 42 })
      );
    });

    it('createCommunication throws when MP returns no ID', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{}]);
      const service = await TextMessageService.getInstance();
      await expect(service.createCommunication(communicationRow())).rejects.toThrow(/Communication_ID/);
    });

    it('attachFile uploads to the communication with the audit user', async () => {
      mockUploadFiles.mockResolvedValueOnce([{ FileId: 77 }]);
      const service = await TextMessageService.getInstance();
      const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
      expect(await service.attachFile(900, file)).toBe(77);
      expect(mockUploadFiles).toHaveBeenCalledWith({
        table: 'dp_Communications',
        recordId: 900,
        files: [file],
        uploadParams: { userId: 42, description: 'Text message attachment' },
      });
    });

    it('createMessages returns 0 for no rows, posts rows with the schema, and rejects oversized batches', async () => {
      const service = await TextMessageService.getInstance();
      expect(await service.createMessages([])).toBe(0);
      mockCreateTableRecords.mockResolvedValueOnce([{}, {}]);
      expect(await service.createMessages([messageRow(), messageRow({ Contact_ID: 12 })])).toBe(2);
      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'dp_Communication_Messages',
        expect.any(Array),
        expect.objectContaining({ schema: textMessageInsertSchema, $userId: 42 })
      );
      const tooMany = Array.from({ length: 1001 }, () => messageRow());
      await expect(service.createMessages(tooMany)).rejects.toThrow(/at most 1000/);
    });

    it('setCommunicationStatus updates the status column', async () => {
      mockUpdateTableRecords.mockResolvedValueOnce([]);
      const service = await TextMessageService.getInstance();
      await service.setCommunicationStatus(900, 2);
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        'dp_Communications',
        [{ Communication_ID: 900, Communication_Status_ID: 2 }],
        { $userId: 42 }
      );
    });
  });

  describe('getDomainMessagingData edge cases', () => {
    it('skips non-array and empty result sets and rows without messaging fields', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([null, [], [{ Domain_ID: 1 }], [{ Message_Curfew_Start_Time: '21:00:00', Message_Curfew_End_Time: '08:00:00', Messaging_Approval_Process_ID: '12' }]]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({ curfew: { start: '21:00', end: '08:00' }, approvalProcessConfigured: true });
    });

    it('treats unparseable or out-of-range curfew values as no curfew and a blank process as unconfigured', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([[{ Message_Curfew_Start_Time: 'soon', Message_Curfew_End_Time: '25:00:00', Messaging_Approval_Process_ID: '' }]]);
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({ curfew: null, approvalProcessConfigured: false });
    });

    it('keeps the review path open when the proc is unavailable or returns nothing useful', async () => {
      mockExecuteProcedure.mockRejectedValueOnce(new Error('403'));
      const service = await TextMessageService.getInstance();
      expect(await service.getDomainMessagingData()).toEqual({ curfew: null, approvalProcessConfigured: true });
      mockExecuteProcedure.mockResolvedValueOnce([[{ Domain_ID: 1 }]]);
      expect(await service.getDomainMessagingData()).toEqual({ curfew: null, approvalProcessConfigured: true });
    });
  });

  describe('pickers and recipient sources', () => {
    it('getSmsNumber returns the active number or null', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ SMS_Number_ID: 5, Number_Title: 'Main', SMS_Number: '+16025550100', Default: true, User_Group_ID: null, Congregation_ID: 3, Cost_Per_Segment: null, Sender_Label: 'Church', Texting_Compliance_Level: 2 }]);
      const service = await TextMessageService.getInstance();
      expect(await service.getSmsNumber(5)).toEqual({ id: 5, label: 'Main', number: '+16025550100', senderLabel: 'Church', congregationId: 3, costPerSegment: null, isDefault: true, complianceLevelId: 2 });
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ table: 'dp_SMS_Numbers', filter: 'SMS_Number_ID = 5 AND Active = 1' }));
      mockGetTableRecords.mockResolvedValueOnce([]);
      expect(await service.getSmsNumber(6)).toBeNull();
    });

    it('lists audiences and publications as select options', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Audience_ID: 1, Audience_Name: 'Volunteers' }]);
      mockGetTableRecords.mockResolvedValueOnce([{ Publication_ID: 9, Title: 'Weekly' }]);
      const service = await TextMessageService.getInstance();
      expect(await service.listAudiences()).toEqual([{ id: 1, label: 'Volunteers' }]);
      expect(await service.listPublications()).toEqual([{ id: 9, label: 'Weekly' }]);
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ table: 'Audiences', filter: 'Active = 1' }));
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ table: 'dp_Publications', top: 200 }));
    });

    it('reads active audience members and subscribed publication contacts', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Contact_ID: 1 }, { Contact_ID: 2 }]);
      mockGetTableRecords.mockResolvedValueOnce([{ Contact_ID: 3 }]);
      const service = await TextMessageService.getInstance();
      expect(await service.getContactIdsForAudience(7)).toEqual([1, 2]);
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ table: 'Audience_Members', filter: expect.stringContaining('Audience_ID = 7 AND Active = 1') }));
      expect(await service.getContactIdsForPublication(9)).toEqual([3]);
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ table: 'dp_Contact_Publications', filter: 'Publication_ID = 9 AND Unsubscribed = 0' }));
    });

    it('returns an empty selection when the stock proc returns an empty result set', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);
      const service = await TextMessageService.getInstance();
      expect(await service.getSelectedContacts(55)).toEqual([]);
    });

    it('ignores junk rows and non-string values when reading merge tags', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce(['nope', [null, 5, { Tag: 7, Other: '[Event_Title]' }]]);
      const service = await TextMessageService.getInstance();
      expect(await service.getMergeTagsForPage(308)).toEqual(['Event_Title']);
    });
  });

  describe('authorization gate', () => {
    it('propagates a gate rejection before any MP read', async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));
      const service = await TextMessageService.getInstance();
      await expect(service.getUserTextQuota()).rejects.toThrow('Not authorized');
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it('propagates a gate rejection before any MP write', async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));
      const service = await TextMessageService.getInstance();
      await expect(service.createMessages([messageRow()])).rejects.toThrow('Not authorized');
      expect(mockCreateTableRecords).not.toHaveBeenCalled();
    });

    it('stamps Author_User_ID and $userId from the gate, not from the caller', async () => {
      mockRequireSecurityRole.mockResolvedValue(77);
      mockCreateTableRecords.mockResolvedValueOnce([{ Communication_ID: 900 }]);
      const service = await TextMessageService.getInstance();
      await service.createCommunication(communicationRow({ Author_User_ID: 1 }));
      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'dp_Communications',
        [expect.objectContaining({ Author_User_ID: 77 })],
        expect.objectContaining({ $userId: 77 })
      );
    });

    it('reads the acting user from the gate for sender-scoped reads', async () => {
      mockRequireSecurityRole.mockResolvedValue(77);
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await TextMessageService.getInstance();
      await service.getUserGlobalFilterCongregationIds();
      expect(mockGetTableRecords).toHaveBeenCalledWith(expect.objectContaining({ filter: 'User_ID = 77' }));
    });
  });

  describe('insert schemas', () => {
    it('reject the ISO datetime format and accept the MP SQL format', () => {
      expect(textCommunicationInsertSchema.safeParse(communicationRow({ Start_Date: '2026-09-16T10:00:00Z' })).success).toBe(false);
      expect(textCommunicationInsertSchema.safeParse(communicationRow()).success).toBe(true);
      expect(textMessageInsertSchema.safeParse(messageRow({ Body: '' })).success).toBe(false);
      expect(textMessageInsertSchema.safeParse(messageRow()).success).toBe(true);
    });
  });
});

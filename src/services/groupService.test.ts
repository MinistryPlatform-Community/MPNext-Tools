import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MPHelper — use vi.hoisted() per project convention
const { mockGetTableRecords, mockCreateTableRecords, mockUpdateTableRecords, mockGetDomainInfo } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
  mockCreateTableRecords: vi.fn(),
  mockUpdateTableRecords: vi.fn(),
  mockGetDomainInfo: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
    updateTableRecords = mockUpdateTableRecords;
    getDomainInfo = mockGetDomainInfo;
  },
}));

/**
 * The service layer now gates every MP-touching method through
 * AuthorizationService. Mock it so these tests exercise the service logic
 * rather than the gate; the gate has its own tests in
 * `authorizationService.test.ts`.
 *
 * The stub returns 42 as the acting MP User_ID, which is also the only source
 * of `$userId` write attribution — so the `$userId: 42` assertions below are
 * asserting that the service takes it from the gate rather than from a caller
 * argument (there no longer is one).
 */
const { mockRequireSecurityRole, mockHasSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(async () => 42),
  mockHasSecurityRole: vi.fn(async () => true),
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
      hasSecurityRole: mockHasSecurityRole,
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));


import { GroupService, GROUP_WRITABLE_FIELDS } from './groupService';
import {
  STEP_FIELDS,
  groupWizardSchema,
  GROUP_WIZARD_DEFAULTS,
} from '@/components/group-wizard/schema';
import { DomainTimezoneService } from './domainTimezoneService';

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDomainInfo.mockReset();
    mockGetDomainInfo.mockResolvedValue({ TimeZoneName: 'America/New_York' });

    (GroupService as any).instance = undefined;
    (DomainTimezoneService as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', async () => {
      const instance1 = await GroupService.getInstance();
      const instance2 = await GroupService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('fetchAllLookups', () => {
    it('should fetch all 13 lookup tables and normalize to {id, name}', async () => {
      // Mock each of the 13 getTableRecords calls in order
      mockGetTableRecords
        .mockResolvedValueOnce([{ Group_Type_ID: 1, Group_Type: 'Small Group' }])
        .mockResolvedValueOnce([{ Ministry_ID: 10, Ministry_Name: 'Youth' }])
        .mockResolvedValueOnce([{ Congregation_ID: 5, Congregation_Name: 'Main Campus' }])
        .mockResolvedValueOnce([{ Meeting_Day_ID: 2, Meeting_Day: 'Monday' }])
        .mockResolvedValueOnce([{ Meeting_Frequency_ID: 1, Meeting_Frequency: 'Weekly' }])
        .mockResolvedValueOnce([{ Meeting_Duration_ID: 3, Meeting_Duration: '1 Hour' }])
        .mockResolvedValueOnce([{ Life_Stage_ID: 4, Life_Stage: 'Adult' }])
        .mockResolvedValueOnce([{ Group_Focus_ID: 2, Group_Focus: 'Bible Study' }])
        .mockResolvedValueOnce([{ Priority_ID: 1, Priority_Name: 'High' }])
        .mockResolvedValueOnce([{ Room_ID: 7, Room_Name: 'Room 101' }])
        .mockResolvedValueOnce([{ Book_ID: 3, Title: 'Genesis' }])
        .mockResolvedValueOnce([{ SMS_Number_ID: 1, Number_Title: 'Main Line' }])
        .mockResolvedValueOnce([{ Group_Ended_Reason_ID: 1, Group_Ended_Reason: 'Completed' }]);

      const service = await GroupService.getInstance();
      const result = await service.fetchAllLookups();

      expect(mockGetTableRecords).toHaveBeenCalledTimes(13);

      expect(result.groupTypes).toEqual([{ id: 1, name: 'Small Group' }]);
      expect(result.ministries).toEqual([{ id: 10, name: 'Youth' }]);
      expect(result.congregations).toEqual([{ id: 5, name: 'Main Campus' }]);
      expect(result.meetingDays).toEqual([{ id: 2, name: 'Monday' }]);
      expect(result.meetingFrequencies).toEqual([{ id: 1, name: 'Weekly' }]);
      expect(result.meetingDurations).toEqual([{ id: 3, name: '1 Hour' }]);
      expect(result.lifeStages).toEqual([{ id: 4, name: 'Adult' }]);
      expect(result.groupFocuses).toEqual([{ id: 2, name: 'Bible Study' }]);
      expect(result.priorities).toEqual([{ id: 1, name: 'High' }]);
      expect(result.rooms).toEqual([{ id: 7, name: 'Room 101' }]);
      expect(result.books).toEqual([{ id: 3, name: 'Genesis' }]);
      expect(result.smsNumbers).toEqual([{ id: 1, name: 'Main Line' }]);
      expect(result.groupEndedReasons).toEqual([{ id: 1, name: 'Completed' }]);
    });

    it('should return empty arrays when lookup tables are empty', async () => {
      for (let i = 0; i < 13; i++) {
        mockGetTableRecords.mockResolvedValueOnce([]);
      }

      const service = await GroupService.getInstance();
      const result = await service.fetchAllLookups();

      expect(result.groupTypes).toEqual([]);
      expect(result.congregations).toEqual([]);
      expect(result.books).toEqual([]);
    });
  });

  describe('searchContacts', () => {
    it('should return matching contacts', async () => {
      const mockContacts = [
        { Contact_ID: 1, Display_Name: 'John Smith', Email_Address: 'john@example.com' },
        { Contact_ID: 2, Display_Name: 'John Doe', Email_Address: null },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockContacts);

      const service = await GroupService.getInstance();
      const result = await service.searchContacts('John');

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Contacts',
        select: 'Contact_ID, Display_Name, Email_Address',
        filter: "Display_Name LIKE 'John%'",
        orderBy: 'Display_Name',
        top: 20,
      });
      expect(result).toEqual(mockContacts);
    });

    it('should escape special characters in search term', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.searchContacts("O'Brien");

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Display_Name LIKE 'O''Brien%'",
        }),
      );
    });
  });

  describe('searchGroups', () => {
    it('should return matching groups', async () => {
      const mockGroups = [
        { Group_ID: 100, Group_Name: 'Youth Group', Group_Type: 'Small Group' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockGroups);

      const service = await GroupService.getInstance();
      const result = await service.searchGroups('Youth');

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Groups',
        select: 'Group_ID, Group_Name, Group_Type_ID_TABLE.Group_Type',
        filter: "Group_Name LIKE 'Youth%' AND End_Date IS NULL",
        orderBy: 'Group_Name',
        top: 20,
      });
      expect(result).toEqual(mockGroups);
    });

    it('should escape special characters in search term', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.searchGroups("Women's");

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Group_Name LIKE 'Women''s%' AND End_Date IS NULL",
        }),
      );
    });
  });

  describe('getGroup', () => {
    it('should return mapped form data and display names for a found group', async () => {
      const rawRecord = {
        Group_Name: 'Bible Study',
        Group_Type_ID: 1,
        Description: 'Weekly study',
        Start_Date: '2024-01-15T00:00:00Z',
        End_Date: null,
        Reason_Ended: null,
        Congregation_ID: 5,
        Ministry_ID: 10,
        Primary_Contact: 42,
        Primary_Contact_Display_Name: 'Jane Doe',
        Parent_Group: 77,
        Parent_Group_Name: 'Parent Group',
        Priority_ID: 1,
        Meeting_Day_ID: 2,
        Meeting_Time: '18:00',
        Meeting_Frequency_ID: 1,
        Meeting_Duration_ID: 3,
        Meets_Online: false,
        Default_Meeting_Room: 7,
        Offsite_Meeting_Address: null,
        Target_Size: 12,
        Life_Stage_ID: 4,
        Group_Focus_ID: 2,
        Required_Book: null,
        SMS_Number: null,
        Group_Is_Full: false,
        Available_Online: true,
        Available_On_App: null,
        Enable_Discussion: false,
        Send_Attendance_Notification: false,
        Send_Service_Notification: false,
        Create_Next_Meeting: false,
        'Secure_Check-in': false,
        Suppress_Nametag: false,
        Suppress_Care_Note: false,
        On_Classroom_Manager: false,
        Promote_to_Group: 88,
        Promote_to_Group_Name: 'Target Group',
        Age_in_Months_to_Promote: null,
        Promote_Weekly: false,
        Promote_Participants_Only: false,
        Promotion_Date: null,
        Descended_From: 99,
        Descended_From_Name: 'Origin Group',
      };
      mockGetTableRecords.mockResolvedValueOnce([rawRecord]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(100);

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Groups',
        select: expect.stringContaining('Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name'),
        filter: 'Groups.Group_ID = 100',
        top: 1,
      });
      expect(result).not.toBeNull();
      expect(result!.data.Group_Name).toBe('Bible Study');
      expect(result!.data.Start_Date).toBe('2024-01-15'); // datetime stripped to date-only
      expect(result!.data.Group_Type_ID).toBe(1);
      expect(result!.data.Meets_Online).toBe(false);
      expect(result!.data.Available_Online).toBe(true);
      expect(result!.data.Target_Size).toBe(12);
      expect(result!.displayNames.contacts).toEqual({ 42: 'Jane Doe' });
      expect(result!.displayNames.groups).toEqual({
        77: 'Parent Group',
        88: 'Target Group',
        99: 'Origin Group',
      });
    });

    it('should return null when group not found', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(999);

      expect(result).toBeNull();
    });

    it('should strip time portion from date fields and omit absent display names', async () => {
      const rawRecord = {
        Group_Name: 'Test',
        Group_Type_ID: 1,
        Description: null,
        Start_Date: '2024-06-01T12:00:00Z',
        End_Date: '2024-12-31T23:59:59Z',
        Reason_Ended: null,
        Congregation_ID: 1,
        Ministry_ID: 1,
        Primary_Contact: 1,
        Primary_Contact_Display_Name: 'Solo Contact',
        Parent_Group: null,
        Parent_Group_Name: null,
        Priority_ID: null,
        Meeting_Day_ID: null,
        Meeting_Time: null,
        Meeting_Frequency_ID: null,
        Meeting_Duration_ID: null,
        Meets_Online: false,
        Default_Meeting_Room: null,
        Offsite_Meeting_Address: null,
        Target_Size: null,
        Life_Stage_ID: null,
        Group_Focus_ID: null,
        Required_Book: null,
        SMS_Number: null,
        Group_Is_Full: false,
        Available_Online: false,
        Available_On_App: null,
        Enable_Discussion: false,
        Send_Attendance_Notification: false,
        Send_Service_Notification: false,
        Create_Next_Meeting: false,
        'Secure_Check-in': false,
        Suppress_Nametag: false,
        Suppress_Care_Note: false,
        On_Classroom_Manager: false,
        Promote_to_Group: null,
        Promote_to_Group_Name: null,
        Age_in_Months_to_Promote: null,
        Promote_Weekly: false,
        Promote_Participants_Only: false,
        Promotion_Date: '2025-09-01T00:00:00Z',
        Descended_From: null,
        Descended_From_Name: null,
      };
      mockGetTableRecords.mockResolvedValueOnce([rawRecord]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(50);

      expect(result!.data.Start_Date).toBe('2024-06-01');
      expect(result!.data.End_Date).toBe('2024-12-31');
      expect(result!.data.Promotion_Date).toBe('2025-09-01');
      // Only the populated contact appears in the display maps
      expect(result!.displayNames.contacts).toEqual({ 1: 'Solo Contact' });
      expect(result!.displayNames.groups).toEqual({});
    });
  });

  describe('createGroup', () => {
    it('should call createTableRecords with correct params and convert dates', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{ Group_ID: 200, Group_Name: 'New Group' }]);

      const formData = {
        Group_Name: 'New Group',
        Group_Type_ID: 1,
        Description: null,
        Start_Date: '2024-03-01',
        End_Date: null,
        Reason_Ended: null,
        Congregation_ID: 5,
        Ministry_ID: 10,
        Primary_Contact: 42,
        Parent_Group: null,
        Priority_ID: null,
        Meeting_Day_ID: null,
        Meeting_Time: null,
        Meeting_Frequency_ID: null,
        Meeting_Duration_ID: null,
        Meets_Online: false,
        Default_Meeting_Room: null,
        Offsite_Meeting_Address: null,
        Target_Size: null,
        Life_Stage_ID: null,
        Group_Focus_ID: null,
        Required_Book: null,
        SMS_Number: null,
        Group_Is_Full: false,
        Available_Online: false,
        Available_On_App: null,
        Enable_Discussion: false,
        Send_Attendance_Notification: false,
        Send_Service_Notification: false,
        Create_Next_Meeting: false,
        'Secure_Check-in': false,
        Suppress_Nametag: false,
        Suppress_Care_Note: false,
        On_Classroom_Manager: false,
        Promote_to_Group: null,
        Age_in_Months_to_Promote: null,
        Promote_Weekly: false,
        Promote_Participants_Only: false,
        Promotion_Date: null,
        Descended_From: null,
      };

      const service = await GroupService.getInstance();
      const result = await service.createGroup(formData);

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Groups',
        [expect.objectContaining({
          Group_Name: 'New Group',
          Start_Date: '2024-03-01 00:00:00', // date-only converted to MP-TZ SQL datetime
          End_Date: null,
          Promotion_Date: null,
        })],
        {
          $select: 'Group_ID, Group_Name',
          $userId: 42,
        },
      );
      expect(result).toEqual({ Group_ID: 200, Group_Name: 'New Group' });
    });
  });

  describe('updateGroup', () => {
    it('should call updateTableRecords with Group_ID prepended and convert dates', async () => {
      mockUpdateTableRecords.mockResolvedValueOnce([{ Group_ID: 100, Group_Name: 'Updated Group' }]);

      const service = await GroupService.getInstance();
      const result = await service.updateGroup(
        100,
        {
          Group_Name: 'Updated Group',
          Start_Date: '2024-06-01',
          End_Date: '2024-12-31',
          Promotion_Date: null,
        } as any, // partial form data
      );

      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        'Groups',
        [expect.objectContaining({
          Group_ID: 100,
          Group_Name: 'Updated Group',
          Start_Date: '2024-06-01 00:00:00',
          End_Date: '2024-12-31 00:00:00',
          Promotion_Date: null,
        })],
        {
          partial: true,
          $select: 'Group_ID, Group_Name',
          $userId: 42,
        },
      );
      expect(result).toEqual({ Group_ID: 100, Group_Name: 'Updated Group' });
    });
  });

  describe('date round-trip regression', () => {
    it('round-tripping the same edit does not shift Start_Date', async () => {
      // Reproduces the source-repo Contact_Log bug pattern: editing without
      // changing the date field must not drift the saved value across
      // successive saves, regardless of the server's local zone.
      mockUpdateTableRecords.mockResolvedValue([{ Group_ID: 7, Group_Name: 'X' }]);

      const service = await GroupService.getInstance();
      await service.updateGroup(7, { Start_Date: '2026-05-17' } as any);
      await service.updateGroup(7, { Start_Date: '2026-05-17' } as any);
      await service.updateGroup(7, { Start_Date: '2026-05-17' } as any);

      for (const call of mockUpdateTableRecords.mock.calls) {
        expect((call[1][0] as { Start_Date: string }).Start_Date).toBe('2026-05-17 00:00:00');
      }
    });
  });

  describe('Groups column allowlist (mass assignment)', () => {
    const FULL = {
      ...GROUP_WIZARD_DEFAULTS,
      Group_Name: 'G',
      Group_Type_ID: 1,
      Start_Date: '2024-03-01',
      Congregation_ID: 5,
      Ministry_ID: 10,
      Primary_Contact: 42,
    };
    const hostileExtras = () => {
      const extras: Record<string, unknown> = Object.create({ Inherited_Column: 1 });
      Object.assign(extras, {
        Group_ID: 999,
        _Last_Attendance_Posted: '2020-01-01',
        Domain_ID: 7,
        $userId: 1,
      });
      return extras;
    };

    it('equals exactly the fields the wizard UI edits (STEP_FIELDS union = schema keys)', () => {
      const stepUnion = Object.values(STEP_FIELDS).flat().sort();
      expect([...GROUP_WRITABLE_FIELDS].sort()).toEqual(stepUnion);
      expect([...GROUP_WRITABLE_FIELDS].sort()).toEqual(
        Object.keys(groupWizardSchema.shape).sort(),
      );
      expect(GROUP_WRITABLE_FIELDS).not.toContain('Group_ID');
    });

    it('createGroup drops every non-allowlisted key, including Group_ID and $userId', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{ Group_ID: 200, Group_Name: 'G' }]);
      const service = await GroupService.getInstance();

      const payload = Object.assign(hostileExtras(), FULL);
      await service.createGroup(payload as any);

      const [table, [record], options] = mockCreateTableRecords.mock.calls[0];
      expect(table).toBe('Groups');
      expect(Object.keys(record).sort()).toEqual([...GROUP_WRITABLE_FIELDS].sort());
      expect(record).not.toHaveProperty('Inherited_Column');
      // Attribution comes from the gate, never from the payload.
      expect(options.$userId).toBe(42);
    });

    it('updateGroup ignores a smuggled Group_ID: the record targeted is the argument', async () => {
      mockUpdateTableRecords.mockResolvedValueOnce([{ Group_ID: 100, Group_Name: 'G' }]);
      const service = await GroupService.getInstance();

      const payload = Object.assign(hostileExtras(), { Group_Name: 'G' });
      await service.updateGroup(100, payload as any);

      const [, [record], options] = mockUpdateTableRecords.mock.calls[0];
      expect(record).toEqual({ Group_Name: 'G', Group_ID: 100 });
      expect(options.$userId).toBe(42);
    });

    it('updateGroup writes Group_ID last so no payload key can override it', async () => {
      // Independent of the allowlist: even if a Group_ID got through the
      // pick, the spread order must leave the argument in force.
      mockUpdateTableRecords.mockResolvedValueOnce([{ Group_ID: 100, Group_Name: 'G' }]);
      const service = await GroupService.getInstance();

      await service.updateGroup(100, { Group_Name: 'G' } as any);

      const [, [record]] = mockUpdateTableRecords.mock.calls[0];
      expect(Object.keys(record).at(-1)).toBe('Group_ID');
    });

    it('updateGroup does not null date fields the payload omitted', async () => {
      mockUpdateTableRecords.mockResolvedValueOnce([{ Group_ID: 100, Group_Name: 'G' }]);
      const service = await GroupService.getInstance();

      await service.updateGroup(100, { Group_Name: 'G' } as any);

      const [, [record]] = mockUpdateTableRecords.mock.calls[0];
      expect(record).not.toHaveProperty('End_Date');
      expect(record).not.toHaveProperty('Promotion_Date');
    });

    it.each([0, -1, 1.5, Number.NaN, '100' as unknown as number])(
      'updateGroup refuses groupId %s before any MP call',
      async (bad) => {
        const service = await GroupService.getInstance();

        await expect(service.updateGroup(bad, { Group_Name: 'G' } as any)).rejects.toThrow();
        expect(mockUpdateTableRecords).not.toHaveBeenCalled();
      },
    );

    it.each(['createGroup', 'updateGroup'] as const)(
      '%s writes nothing when the gate throws',
      async (method) => {
        mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));
        const service = await GroupService.getInstance();

        const call =
          method === 'createGroup'
            ? service.createGroup(FULL as any)
            : service.updateGroup(100, FULL as any);
        await expect(call).rejects.toThrow('Not authorized');
        expect(mockCreateTableRecords).not.toHaveBeenCalled();
        expect(mockUpdateTableRecords).not.toHaveBeenCalled();
      },
    );
  });

  describe('error propagation', () => {
    it('should propagate errors from getTableRecords', async () => {
      mockGetTableRecords.mockRejectedValueOnce(new Error('API error'));

      const service = await GroupService.getInstance();
      await expect(service.searchContacts('John')).rejects.toThrow('API error');
    });

    it('should propagate errors from createTableRecords', async () => {
      mockCreateTableRecords.mockRejectedValueOnce(new Error('Create failed'));

      const service = await GroupService.getInstance();
      await expect(
        service.createGroup({ Group_Name: 'Test' } as any),
      ).rejects.toThrow('Create failed');
    });
  });
});

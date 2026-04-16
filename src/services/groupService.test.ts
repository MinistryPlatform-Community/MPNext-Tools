import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MPHelper — use vi.hoisted() per project convention
const { mockGetTableRecords, mockCreateTableRecords, mockUpdateTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
  mockCreateTableRecords: vi.fn(),
  mockUpdateTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
    updateTableRecords = mockUpdateTableRecords;
  },
}));

import { GroupService } from './groupService';

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GroupService as any).instance = undefined;
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
    it('should return mapped GroupWizardFormData for a found group', async () => {
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
        Parent_Group: null,
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
        Promote_to_Group: null,
        Age_in_Months_to_Promote: null,
        Promote_Weekly: false,
        Promote_Participants_Only: false,
        Promotion_Date: null,
        Descended_From: null,
      };
      mockGetTableRecords.mockResolvedValueOnce([rawRecord]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(100);

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Groups',
        filter: 'Group_ID = 100',
        top: 1,
      });
      expect(result).not.toBeNull();
      expect(result!.Group_Name).toBe('Bible Study');
      expect(result!.Start_Date).toBe('2024-01-15'); // datetime stripped to date-only
      expect(result!.Group_Type_ID).toBe(1);
      expect(result!.Meets_Online).toBe(false);
      expect(result!.Available_Online).toBe(true);
      expect(result!.Target_Size).toBe(12);
    });

    it('should return null when group not found', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(999);

      expect(result).toBeNull();
    });

    it('should strip time portion from date fields', async () => {
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
        Promotion_Date: '2025-09-01T00:00:00Z',
        Descended_From: null,
      };
      mockGetTableRecords.mockResolvedValueOnce([rawRecord]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(50);

      expect(result!.Start_Date).toBe('2024-06-01');
      expect(result!.End_Date).toBe('2024-12-31');
      expect(result!.Promotion_Date).toBe('2025-09-01');
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
      const result = await service.createGroup(formData, 42);

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Groups',
        [expect.objectContaining({
          Group_Name: 'New Group',
          Start_Date: '2024-03-01T00:00:00Z', // date-only converted to datetime
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
        42,
      );

      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        'Groups',
        [expect.objectContaining({
          Group_ID: 100,
          Group_Name: 'Updated Group',
          Start_Date: '2024-06-01T00:00:00Z',
          End_Date: '2024-12-31T00:00:00Z',
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
        service.createGroup({ Group_Name: 'Test' } as any, 1),
      ).rejects.toThrow('Create failed');
    });
  });
});

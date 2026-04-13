import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTableRecords = vi.fn();
const mockCreateTableRecords = vi.fn();
const mockUpdateTableRecords = vi.fn();
const mockDeleteTableRecords = vi.fn();

vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      getTableRecords = mockGetTableRecords;
      createTableRecords = mockCreateTableRecords;
      updateTableRecords = mockUpdateTableRecords;
      deleteTableRecords = mockDeleteTableRecords;
    },
  };
});

import { GroupService } from './groupService';

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- singleton reset pattern
    (GroupService as any).instance = undefined;
  });

  describe('getMinistries', () => {
    it('should fetch active ministries', async () => {
      const mockMinistries = [
        { Ministry_ID: 1, Ministry_Name: 'Worship' },
        { Ministry_ID: 2, Ministry_Name: 'Children' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockMinistries);

      const service = await GroupService.getInstance();
      const result = await service.getMinistries();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Ministries',
          filter: 'End_Date IS NULL',
          orderBy: 'Ministry_Name',
        })
      );
      expect(result).toEqual(mockMinistries);
    });
  });

  describe('getGroupFocuses', () => {
    it('should fetch group focuses by specific IDs', async () => {
      const mockFocuses = [
        { Group_Focus_ID: 6, Group_Focus: 'Men' },
        { Group_Focus_ID: 7, Group_Focus: 'Women' },
        { Group_Focus_ID: 24, Group_Focus: 'Men and Women' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockFocuses);

      const service = await GroupService.getInstance();
      const result = await service.getGroupFocuses();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Group_Focuses',
          filter: 'Group_Focus_ID IN (6, 7, 24)',
        })
      );
      expect(result).toEqual(mockFocuses);
    });
  });

  describe('getGroupTags', () => {
    it('should fetch tags where Tag_Group is Groups', async () => {
      const mockTags = [{ Tag_ID: 1, Tag: 'Outreach' }];
      mockGetTableRecords.mockResolvedValueOnce(mockTags);

      const service = await GroupService.getInstance();
      const result = await service.getGroupTags();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Tags',
          filter: "Tag_Group = 'Groups'",
        })
      );
      expect(result).toEqual(mockTags);
    });
  });

  describe('searchApprovedVolunteers', () => {
    it('should search contacts by display name', async () => {
      const mockResults = [{ Contact_ID: 100, Display_Name: 'John Doe', Participant_ID: 50 }];
      mockGetTableRecords.mockResolvedValueOnce(mockResults);

      const service = await GroupService.getInstance();
      const result = await service.searchApprovedVolunteers('John');

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Contacts',
          filter: "Display_Name LIKE '%John%' AND Contact_Status_ID = 1",
          top: 20,
        })
      );
      expect(result).toEqual(mockResults);
    });

    it('should escape single quotes in search term', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.searchApprovedVolunteers("O'Brien");

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Display_Name LIKE '%O''Brien%' AND Contact_Status_ID = 1",
        })
      );
    });
  });

  describe('getGroup', () => {
    it('should return a group by ID', async () => {
      const mockGroup = { Group_ID: 10, Group_Name: 'Test Group' };
      mockGetTableRecords.mockResolvedValueOnce([mockGroup]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(10);

      expect(result).toEqual(mockGroup);
    });

    it('should return null when not found', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      const result = await service.getGroup(999);

      expect(result).toBeNull();
    });
  });

  describe('createGroup', () => {
    it('should create a group record', async () => {
      const created = [{ Group_ID: 42, Group_Name: 'New Group' }];
      mockCreateTableRecords.mockResolvedValueOnce(created);

      const service = await GroupService.getInstance();
      const result = await service.createGroup({ Group_Name: 'New Group', Group_Type_ID: 2 });

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Groups',
        [expect.objectContaining({ Group_Name: 'New Group' })],
        { $select: 'Group_ID, Group_Name' }
      );
      expect(result).toEqual(created);
    });
  });

  describe('createAddress', () => {
    it('should create an address and return the ID', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{ Address_ID: 77 }]);

      const service = await GroupService.getInstance();
      const result = await service.createAddress({
        addressLine1: '123 Main St',
        city: 'Melbourne',
        state: 'FL',
        postalCode: '32901',
      });

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Addresses',
        [expect.objectContaining({ Address_Line_1: '123 Main St' })],
        { $select: 'Address_ID' }
      );
      expect(result).toBe(77);
    });
  });

  describe('getGroupLeader', () => {
    it('should find the current leader of a group', async () => {
      const mockLeader = { Group_Participant_ID: 1, Participant_ID: 50, Contact_ID: 100, Group_Role_ID: 7 };
      mockGetTableRecords.mockResolvedValueOnce([mockLeader]);

      const service = await GroupService.getInstance();
      const result = await service.getGroupLeader(10);

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Group_Participants',
          filter: 'Group_ID = 10 AND Group_Role_ID = 7 AND End_Date IS NULL',
        })
      );
      expect(result).toEqual(mockLeader);
    });
  });

  describe('addGroupLeader', () => {
    it('should create a group participant with leader role', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([{}]);

      const service = await GroupService.getInstance();
      await service.addGroupLeader(10, 50);

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Group_Participants',
        [expect.objectContaining({
          Group_ID: 10,
          Participant_ID: 50,
          Group_Role_ID: 7,
        })]
      );
    });
  });

  describe('endGroupLeader', () => {
    it('should end-date a group participant record', async () => {
      mockUpdateTableRecords.mockResolvedValueOnce([{}]);

      const service = await GroupService.getInstance();
      await service.endGroupLeader(1);

      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        'Group_Participants',
        [expect.objectContaining({ Group_Participant_ID: 1 })]
      );
    });
  });

  describe('tag operations', () => {
    it('should fetch group tag records', async () => {
      const mockTags = [{ Group_Tag_ID: 1, Tag_ID: 5, Group_ID: 10 }];
      mockGetTableRecords.mockResolvedValueOnce(mockTags);

      const service = await GroupService.getInstance();
      const result = await service.getGroupTagRecords(10);

      expect(result).toEqual(mockTags);
    });

    it('should add group tags', async () => {
      mockCreateTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.addGroupTags(10, [5, 6]);

      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Group_Tags',
        [
          { Tag_ID: 5, Group_ID: 10 },
          { Tag_ID: 6, Group_ID: 10 },
        ]
      );
    });

    it('should not call API when adding empty tags', async () => {
      const service = await GroupService.getInstance();
      await service.addGroupTags(10, []);

      expect(mockCreateTableRecords).not.toHaveBeenCalled();
    });

    it('should remove group tags', async () => {
      mockDeleteTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.removeGroupTags([1, 2]);

      expect(mockDeleteTableRecords).toHaveBeenCalledWith('Group_Tags', [1, 2]);
    });

    it('should not call API when removing empty tags', async () => {
      const service = await GroupService.getInstance();
      await service.removeGroupTags([]);

      expect(mockDeleteTableRecords).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Group Wizard methods
  // ----------------------------------------------------------------

  describe('getMeetingDays', () => {
    it('should fetch meeting days', async () => {
      const mockDays = [
        { Meeting_Day_ID: 1, Meeting_Day: 'Sunday' },
        { Meeting_Day_ID: 2, Meeting_Day: 'Monday' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockDays);

      const service = await GroupService.getInstance();
      const result = await service.getMeetingDays();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Meeting_Days',
          select: 'Meeting_Day_ID, Meeting_Day',
          orderBy: 'Meeting_Day_ID',
        })
      );
      expect(result).toEqual(mockDays);
    });
  });

  describe('getMeetingFrequencies', () => {
    it('should fetch meeting frequencies', async () => {
      const mockFreqs = [
        { Meeting_Frequency_ID: 1, Meeting_Frequency: 'Weekly' },
        { Meeting_Frequency_ID: 2, Meeting_Frequency: 'Bi-Weekly' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockFreqs);

      const service = await GroupService.getInstance();
      const result = await service.getMeetingFrequencies();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Meeting_Frequencies',
          select: 'Meeting_Frequency_ID, Meeting_Frequency',
          orderBy: 'Meeting_Frequency',
        })
      );
      expect(result).toEqual(mockFreqs);
    });
  });

  describe('getMeetingDurations', () => {
    it('should fetch meeting durations', async () => {
      const mockDurations = [
        { Meeting_Duration_ID: 1, Meeting_Duration: '1 Hour' },
        { Meeting_Duration_ID: 2, Meeting_Duration: '1.5 Hours' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockDurations);

      const service = await GroupService.getInstance();
      const result = await service.getMeetingDurations();

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Meeting_Durations',
          select: 'Meeting_Duration_ID, Meeting_Duration',
          orderBy: 'Meeting_Duration',
        })
      );
      expect(result).toEqual(mockDurations);
    });
  });

  describe('getRoomsByCongregation', () => {
    it('should fetch rooms filtered by congregation via multi-level FK traversal', async () => {
      const mockRooms = [
        { Room_ID: 1, Room_Name: 'Room A', Building_Name: 'Main Building' },
        { Room_ID: 2, Room_Name: 'Room B', Building_Name: 'Main Building' },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockRooms);

      const service = await GroupService.getInstance();
      const result = await service.getRoomsByCongregation(5);

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Rooms',
          select: 'Room_ID, Room_Name, Building_ID_TABLE.Building_Name',
          filter: 'Building_ID_TABLE_Location_ID_TABLE.Congregation_ID = 5',
          orderBy: 'Building_ID_TABLE.Building_Name, Room_Name',
        })
      );
      expect(result).toEqual(mockRooms);
    });
  });

  describe('searchBooks', () => {
    it('should search active books by title', async () => {
      const mockBooks = [
        { Book_ID: 1, Title: 'Test Book', ISBN: '123', Cost: 9.99 },
      ];
      mockGetTableRecords.mockResolvedValueOnce(mockBooks);

      const service = await GroupService.getInstance();
      const result = await service.searchBooks('Test');

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Books',
          filter: "Title LIKE '%Test%' AND Active = 1",
          top: 20,
        })
      );
      expect(result).toEqual(mockBooks);
    });

    it('should escape single quotes in book search term', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      await service.searchBooks("Leader's Guide");

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Title LIKE '%Leader''s Guide%' AND Active = 1",
        })
      );
    });
  });

  describe('getAddress', () => {
    it('should return address data mapped to OffsiteAddressData', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{
        Address_Line_1: '123 Main St',
        Address_Line_2: 'Suite 100',
        City: 'Melbourne',
        'State/Region': 'FL',
        Postal_Code: '32901',
      }]);

      const service = await GroupService.getInstance();
      const result = await service.getAddress(77);

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Addresses',
          filter: 'Address_ID = 77',
          top: 1,
        })
      );
      expect(result).toEqual({
        addressLine1: '123 Main St',
        addressLine2: 'Suite 100',
        city: 'Melbourne',
        state: 'FL',
        postalCode: '32901',
      });
    });

    it('should return null when address not found', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await GroupService.getInstance();
      const result = await service.getAddress(999);

      expect(result).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockGetMinistries,
  mockGetGroupFocuses,
  mockGetGroupTags,
  mockGetMeetingDays,
  mockGetMeetingFrequencies,
  mockGetMeetingDurations,
  mockSearchApprovedVolunteers,
  mockSearchBooks,
  mockGetRoomsByCongregation,
  mockGetGroupWithDisplayName,
  mockGetGroupTagRecords,
  mockGetAddress,
  mockCreateGroup,
  mockUpdateGroup,
  mockCreateAddress,
  mockGetParticipantByContactId,
  mockCreateParticipant,
  mockGetGroupLeader,
  mockAddGroupLeader,
  mockEndGroupLeader,
  mockAddGroupTags,
  mockRemoveGroupTags,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetMinistries: vi.fn(),
  mockGetGroupFocuses: vi.fn(),
  mockGetGroupTags: vi.fn(),
  mockGetMeetingDays: vi.fn(),
  mockGetMeetingFrequencies: vi.fn(),
  mockGetMeetingDurations: vi.fn(),
  mockSearchApprovedVolunteers: vi.fn(),
  mockSearchBooks: vi.fn(),
  mockGetRoomsByCongregation: vi.fn(),
  mockGetGroupWithDisplayName: vi.fn(),
  mockGetGroupTagRecords: vi.fn(),
  mockGetAddress: vi.fn(),
  mockCreateGroup: vi.fn(),
  mockUpdateGroup: vi.fn(),
  mockCreateAddress: vi.fn(),
  mockGetParticipantByContactId: vi.fn(),
  mockCreateParticipant: vi.fn(),
  mockGetGroupLeader: vi.fn(),
  mockAddGroupLeader: vi.fn(),
  mockEndGroupLeader: vi.fn(),
  mockAddGroupTags: vi.fn(),
  mockRemoveGroupTags: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/groupService', () => ({
  GroupService: {
    getInstance: vi.fn().mockResolvedValue({
      getMinistries: mockGetMinistries,
      getGroupFocuses: mockGetGroupFocuses,
      getGroupTags: mockGetGroupTags,
      getMeetingDays: mockGetMeetingDays,
      getMeetingFrequencies: mockGetMeetingFrequencies,
      getMeetingDurations: mockGetMeetingDurations,
      searchApprovedVolunteers: mockSearchApprovedVolunteers,
      searchBooks: mockSearchBooks,
      getRoomsByCongregation: mockGetRoomsByCongregation,
      getGroupWithDisplayName: mockGetGroupWithDisplayName,
      getGroupTagRecords: mockGetGroupTagRecords,
      getAddress: mockGetAddress,
      createGroup: mockCreateGroup,
      updateGroup: mockUpdateGroup,
      createAddress: mockCreateAddress,
      getParticipantByContactId: mockGetParticipantByContactId,
      createParticipant: mockCreateParticipant,
      getGroupLeader: mockGetGroupLeader,
      addGroupLeader: mockAddGroupLeader,
      endGroupLeader: mockEndGroupLeader,
      addGroupTags: mockAddGroupTags,
      removeGroupTags: mockRemoveGroupTags,
    }),
  },
}));

import {
  loadGroupWizardLookupData,
  loadGroupData,
  searchContacts,
  searchBooks,
  loadRoomsByCongregation,
  saveGroupWizard,
} from './actions';
import type { GroupWizardFormData } from '@/lib/dto';

const validSession = { user: { id: 'test-id', userGuid: 'test-guid' } };

describe('group-wizard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(validSession);
  });

  // ----------------------------------------------------------------
  // loadGroupWizardLookupData
  // ----------------------------------------------------------------

  describe('loadGroupWizardLookupData', () => {
    it('should throw when no session exists', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(loadGroupWizardLookupData()).rejects.toThrow('Unauthorized');
    });

    it('should return lookup data with meeting lookups', async () => {
      const ministries = [{ Ministry_ID: 1, Ministry_Name: 'Worship' }];
      const focuses = [{ Group_Focus_ID: 6, Group_Focus: 'Men' }];
      const tags = [{ Tag_ID: 1, Tag: 'Outreach' }];
      const meetingDays = [{ Meeting_Day_ID: 1, Meeting_Day: 'Sunday' }];
      const meetingFrequencies = [{ Meeting_Frequency_ID: 1, Meeting_Frequency: 'Weekly' }];
      const meetingDurations = [{ Meeting_Duration_ID: 1, Meeting_Duration: '1 Hour' }];

      mockGetMinistries.mockResolvedValueOnce(ministries);
      mockGetGroupFocuses.mockResolvedValueOnce(focuses);
      mockGetGroupTags.mockResolvedValueOnce(tags);
      mockGetMeetingDays.mockResolvedValueOnce(meetingDays);
      mockGetMeetingFrequencies.mockResolvedValueOnce(meetingFrequencies);
      mockGetMeetingDurations.mockResolvedValueOnce(meetingDurations);

      const result = await loadGroupWizardLookupData();

      expect(result).toEqual({
        ministries,
        groupFocuses: focuses,
        tags,
        meetingDays,
        meetingFrequencies,
        meetingDurations,
      });
    });
  });

  // ----------------------------------------------------------------
  // loadGroupData
  // ----------------------------------------------------------------

  describe('loadGroupData', () => {
    it('should return null when group not found', async () => {
      mockGetGroupWithDisplayName.mockResolvedValueOnce(null);
      const result = await loadGroupData(999);
      expect(result).toBeNull();
    });

    it('should return group data with tags and mapped fields', async () => {
      mockGetGroupWithDisplayName.mockResolvedValueOnce({
        Group_ID: 10,
        Group_Name: 'Test Small Group',
        Group_Type_ID: 1,
        Description: 'A test description',
        Facebook_Group: 'https://facebook.com/test',
        Target_Size: 12,
        Start_Date: '2024-01-01',
        End_Date: null,
        Meeting_Day_ID: 2,
        Meeting_Frequency_ID: 1,
        Meeting_Time: '19:00:00',
        Meeting_Duration_ID: 1,
        Congregation_ID: 5,
        Group_Meeting_Type_ID: 1,
        Meets_Online: false,
        Confidential: false,
        Default_Room: null,
        Offsite_Meeting_Address: null,
        Is_Child_Care_Available: true,
        Kids_Welcome: false,
        Ministry_ID: 1,
        Group_Focus_ID: 24,
        Primary_Contact: 100,
        Primary_Contact_Display_Name: 'John Doe',
        Required_Book: null,
        Registration_Start: '2024-01-01',
        Registration_End: null,
        Group_Is_Full: false,
        Available_Online: true,
      });
      mockGetGroupTagRecords.mockResolvedValueOnce([
        { Group_Tag_ID: 1, Tag_ID: 5, Group_ID: 10 },
      ]);

      const result = await loadGroupData(10);

      expect(result).toEqual(
        expect.objectContaining({
          Group_ID: 10,
          Group_Name: 'Test Small Group',
          Is_Child_Care_Available: true,
          Kids_Welcome: false,
          tagIds: [5],
        })
      );
    });

    it('should load offsite address when Offsite_Meeting_Address is set', async () => {
      mockGetGroupWithDisplayName.mockResolvedValueOnce({
        Group_ID: 10,
        Group_Name: 'Offsite Group',
        Group_Type_ID: 1,
        Description: null,
        Facebook_Group: null,
        Target_Size: null,
        Start_Date: '2024-01-01',
        End_Date: null,
        Meeting_Day_ID: null,
        Meeting_Frequency_ID: null,
        Meeting_Time: null,
        Meeting_Duration_ID: null,
        Congregation_ID: 5,
        Group_Meeting_Type_ID: 2,
        Meets_Online: false,
        Confidential: false,
        Default_Room: null,
        Offsite_Meeting_Address: 77,
        Is_Child_Care_Available: false,
        Kids_Welcome: false,
        Ministry_ID: 1,
        Group_Focus_ID: null,
        Primary_Contact: 100,
        Primary_Contact_Display_Name: 'John Doe',
        Required_Book: null,
        Registration_Start: null,
        Registration_End: null,
        Group_Is_Full: false,
        Available_Online: true,
      });
      mockGetGroupTagRecords.mockResolvedValueOnce([]);
      mockGetAddress.mockResolvedValueOnce({
        addressLine1: '123 Main St',
        city: 'Melbourne',
        state: 'FL',
        postalCode: '32901',
      });

      const result = await loadGroupData(10);

      expect(mockGetAddress).toHaveBeenCalledWith(77);
      expect(result?.offsiteAddress).toEqual({
        addressLine1: '123 Main St',
        city: 'Melbourne',
        state: 'FL',
        postalCode: '32901',
      });
    });
  });

  // ----------------------------------------------------------------
  // searchContacts
  // ----------------------------------------------------------------

  describe('searchContacts', () => {
    it('should return empty for short terms', async () => {
      const result = await searchContacts('J');
      expect(result).toEqual([]);
      expect(mockSearchApprovedVolunteers).not.toHaveBeenCalled();
    });

    it('should search for contacts', async () => {
      const contacts = [{ Contact_ID: 1, Display_Name: 'John', Participant_ID: 5 }];
      mockSearchApprovedVolunteers.mockResolvedValueOnce(contacts);

      const result = await searchContacts('John');

      expect(mockSearchApprovedVolunteers).toHaveBeenCalledWith('John');
      expect(result).toEqual(contacts);
    });
  });

  // ----------------------------------------------------------------
  // searchBooks
  // ----------------------------------------------------------------

  describe('searchBooks', () => {
    it('should return empty for short terms', async () => {
      const result = await searchBooks('B');
      expect(result).toEqual([]);
      expect(mockSearchBooks).not.toHaveBeenCalled();
    });

    it('should search for books', async () => {
      const books = [{ Book_ID: 1, Title: 'Bible Study Guide', ISBN: '123', Cost: 9.99 }];
      mockSearchBooks.mockResolvedValueOnce(books);

      const result = await searchBooks('Bible');

      expect(mockSearchBooks).toHaveBeenCalledWith('Bible');
      expect(result).toEqual(books);
    });
  });

  // ----------------------------------------------------------------
  // loadRoomsByCongregation
  // ----------------------------------------------------------------

  describe('loadRoomsByCongregation', () => {
    it('should return rooms for a congregation', async () => {
      const rooms = [{ Room_ID: 1, Room_Name: 'Room A', Building_Name: 'Main' }];
      mockGetRoomsByCongregation.mockResolvedValueOnce(rooms);

      const result = await loadRoomsByCongregation(5);

      expect(mockGetRoomsByCongregation).toHaveBeenCalledWith(5);
      expect(result).toEqual(rooms);
    });
  });

  // ----------------------------------------------------------------
  // saveGroupWizard
  // ----------------------------------------------------------------

  describe('saveGroupWizard', () => {
    const baseFormData: GroupWizardFormData = {
      groupName: 'Test Small Group',
      description: 'A test group description that meets the minimum length requirements for validation purposes',
      startDate: '2024-06-01T18:00',
      meetingDayId: 2,
      meetingFrequencyId: 1,
      meetingTime: '19:00',
      meetingDurationId: 1,
      congregationId: 5,
      meetingTypeId: 1,
      hybrid: false,
      confidential: false,
      children: 'no',
      tagIds: [5, 6],
      ministryId: 1,
      groupFocusId: 24,
      primaryContactId: 100,
      hasRequiredBook: false,
      registrationStart: '2024-05-01',
      groupIsFull: false,
    };

    it('should create a new group', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveGroupWizard(baseFormData);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(42);
      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          Group_Type_ID: 1,
          Available_Online: true,
          Group_Name: 'Test Small Group',
        })
      );
      expect(mockAddGroupLeader).toHaveBeenCalledWith(42, 50);
      expect(mockAddGroupTags).toHaveBeenCalledWith(42, [5, 6]);
    });

    it('should update an existing group', async () => {
      mockUpdateGroup.mockResolvedValueOnce([{}]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce({ Group_Participant_ID: 1, Contact_ID: 100 });
      mockGetGroupTagRecords.mockResolvedValueOnce([
        { Group_Tag_ID: 10, Tag_ID: 5, Group_ID: 20 },
      ]);

      const result = await saveGroupWizard(baseFormData, 20);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(20);
      expect(mockUpdateGroup).toHaveBeenCalled();
      expect(mockEndGroupLeader).not.toHaveBeenCalled();
      expect(mockAddGroupTags).toHaveBeenCalledWith(20, [6]);
      expect(mockRemoveGroupTags).toHaveBeenCalledWith([]);
    });

    it('should handle leader change on edit', async () => {
      mockUpdateGroup.mockResolvedValueOnce([{}]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 60 });
      mockGetGroupLeader.mockResolvedValueOnce({
        Group_Participant_ID: 1,
        Contact_ID: 200,
      });
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveGroupWizard(baseFormData, 20);

      expect(result.success).toBe(true);
      expect(mockEndGroupLeader).toHaveBeenCalledWith(1);
      expect(mockAddGroupLeader).toHaveBeenCalledWith(20, 60);
    });

    it('should create participant if none exists', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce(null);
      mockCreateParticipant.mockResolvedValueOnce(70);
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveGroupWizard(baseFormData);

      expect(result.success).toBe(true);
      expect(mockCreateParticipant).toHaveBeenCalledWith(100);
      expect(mockAddGroupLeader).toHaveBeenCalledWith(42, 70);
    });

    it('should map children=no to both false', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, children: 'no' });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          Is_Child_Care_Available: false,
          Kids_Welcome: false,
        })
      );
    });

    it('should map children=care to Is_Child_Care_Available=true', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, children: 'care' });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          Is_Child_Care_Available: true,
          Kids_Welcome: false,
        })
      );
    });

    it('should map children=welcome to Kids_Welcome=true', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, children: 'welcome' });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          Is_Child_Care_Available: false,
          Kids_Welcome: true,
        })
      );
    });

    it('should set Meets_Online=true when meeting type is Online', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, meetingTypeId: 3 });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Meets_Online: true })
      );
    });

    it('should set Meets_Online=true when hybrid is true', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, hybrid: true });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Meets_Online: true })
      );
    });

    it('should set Meets_Online=false for onsite without hybrid', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({ ...baseFormData, meetingTypeId: 1, hybrid: false });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Meets_Online: false })
      );
    });

    it('should create offsite address for offsite meetings', async () => {
      const offsiteFormData: GroupWizardFormData = {
        ...baseFormData,
        meetingTypeId: 2,
        offsiteAddress: {
          addressLine1: '123 Main St',
          city: 'Melbourne',
          state: 'FL',
          postalCode: '32901',
        },
      };
      mockCreateAddress.mockResolvedValueOnce(77);
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveGroupWizard(offsiteFormData);

      expect(result.success).toBe(true);
      expect(mockCreateAddress).toHaveBeenCalledWith(offsiteFormData.offsiteAddress);
      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Offsite_Meeting_Address: 77 })
      );
    });

    it('should set Required_Book when hasRequiredBook is true', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({
        ...baseFormData,
        hasRequiredBook: true,
        requiredBookId: 10,
      });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Required_Book: 10 })
      );
    });

    it('should set Required_Book=null when hasRequiredBook is false', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      await saveGroupWizard({
        ...baseFormData,
        hasRequiredBook: false,
        requiredBookId: 10,
      });

      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ Required_Book: null })
      );
    });

    it('should return error on failure', async () => {
      mockCreateGroup.mockRejectedValueOnce(new Error('API error'));

      const result = await saveGroupWizard(baseFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });
});

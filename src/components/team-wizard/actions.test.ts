import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockGetMinistries,
  mockGetGroupFocuses,
  mockGetGroupTags,
  mockSearchApprovedVolunteers,
  mockGetGroupWithDisplayName,
  mockGetGroupTagRecords,
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
  mockSearchApprovedVolunteers: vi.fn(),
  mockGetGroupWithDisplayName: vi.fn(),
  mockGetGroupTagRecords: vi.fn(),
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
      searchApprovedVolunteers: mockSearchApprovedVolunteers,
      getGroupWithDisplayName: mockGetGroupWithDisplayName,
      getGroupTagRecords: mockGetGroupTagRecords,
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

import { loadWizardLookupData, loadGroupData, searchContacts, saveTeamWizard } from './actions';
import type { TeamWizardFormData } from '@/lib/dto';

const validSession = { user: { id: 'test-id', userGuid: 'test-guid' } };

describe('team-wizard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(validSession);
  });

  describe('loadWizardLookupData', () => {
    it('should throw when no session exists', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(loadWizardLookupData()).rejects.toThrow('Unauthorized');
    });

    it('should return lookup data', async () => {
      const ministries = [{ Ministry_ID: 1, Ministry_Name: 'Worship' }];
      const focuses = [{ Group_Focus_ID: 6, Group_Focus: 'Men' }];
      const tags = [{ Tag_ID: 1, Tag: 'Outreach' }];
      mockGetMinistries.mockResolvedValueOnce(ministries);
      mockGetGroupFocuses.mockResolvedValueOnce(focuses);
      mockGetGroupTags.mockResolvedValueOnce(tags);

      const result = await loadWizardLookupData();

      expect(result).toEqual({ ministries, groupFocuses: focuses, tags });
    });
  });

  describe('loadGroupData', () => {
    it('should return null when group not found', async () => {
      mockGetGroupWithDisplayName.mockResolvedValueOnce(null);
      const result = await loadGroupData(999);
      expect(result).toBeNull();
    });

    it('should return group data with tags', async () => {
      mockGetGroupWithDisplayName.mockResolvedValueOnce({
        Group_ID: 10,
        Group_Name: 'Test',
        Group_Type_ID: 2,
        Description: 'Desc',
        Start_Date: '2024-01-01',
        End_Date: null,
        Target_Size: null,
        Congregation_ID: 5,
        Ministry_ID: 1,
        Group_Focus_ID: 6,
        Primary_Contact: 100,
        Primary_Contact_Display_Name: 'John Doe',
        Registration_Start: null,
        Registration_End: null,
        Available_Online: false,
        Offsite_Meeting_Address: null,
      });
      mockGetGroupTagRecords.mockResolvedValueOnce([
        { Group_Tag_ID: 1, Tag_ID: 5, Group_ID: 10 },
      ]);

      const result = await loadGroupData(10);

      expect(result).toEqual(
        expect.objectContaining({
          Group_ID: 10,
          Group_Name: 'Test',
          tagIds: [5],
        })
      );
    });
  });

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

  describe('saveTeamWizard', () => {
    const baseFormData: TeamWizardFormData = {
      groupName: 'Test Group',
      groupTypeId: 2,
      description: 'A test group description that meets minimum length requirements for validation',
      startDate: '2024-06-01',
      congregationId: 5,
      ministryId: 1,
      primaryContactId: 100,
      tagIds: [5, 6],
    };

    it('should create a new group', async () => {
      mockCreateGroup.mockResolvedValueOnce([{ Group_ID: 42 }]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 50 });
      mockGetGroupLeader.mockResolvedValueOnce(null);
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveTeamWizard(baseFormData);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(42);
      expect(mockCreateGroup).toHaveBeenCalled();
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

      const result = await saveTeamWizard(baseFormData, 20);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(20);
      expect(mockUpdateGroup).toHaveBeenCalled();
      // Same leader, should not end-date
      expect(mockEndGroupLeader).not.toHaveBeenCalled();
      // Tag 5 already exists, only tag 6 should be added
      expect(mockAddGroupTags).toHaveBeenCalledWith(20, [6]);
      expect(mockRemoveGroupTags).toHaveBeenCalledWith([]);
    });

    it('should handle leader change on edit', async () => {
      mockUpdateGroup.mockResolvedValueOnce([{}]);
      mockGetParticipantByContactId.mockResolvedValueOnce({ Participant_ID: 60 });
      mockGetGroupLeader.mockResolvedValueOnce({
        Group_Participant_ID: 1,
        Participant_ID: 50,
        Contact_ID: 200, // Different from primaryContactId=100
      });
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveTeamWizard(baseFormData, 20);

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

      const result = await saveTeamWizard(baseFormData);

      expect(result.success).toBe(true);
      expect(mockCreateParticipant).toHaveBeenCalledWith(100);
      expect(mockAddGroupLeader).toHaveBeenCalledWith(42, 70);
    });

    it('should create offsite address for Quick Serve', async () => {
      const qsFormData: TeamWizardFormData = {
        ...baseFormData,
        groupTypeId: 12,
        registrationStart: '2024-05-01',
        meetingLocationOnCampus: false,
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

      const result = await saveTeamWizard(qsFormData);

      expect(result.success).toBe(true);
      expect(mockCreateAddress).toHaveBeenCalledWith(qsFormData.offsiteAddress);
    });

    it('should return error on failure', async () => {
      mockCreateGroup.mockRejectedValueOnce(new Error('API error'));
      mockGetGroupTagRecords.mockResolvedValueOnce([]);

      const result = await saveTeamWizard(baseFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });
});

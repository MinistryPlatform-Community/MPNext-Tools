import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockFetchAllLookups,
  mockSearchContacts,
  mockSearchGroups,
  mockGetGroup,
  mockCreateGroup,
  mockUpdateGroup,
  mockGetUserIdByGuid,
  mockGroupGetInstance,
  mockUserGetInstance,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFetchAllLookups: vi.fn(),
  mockSearchContacts: vi.fn(),
  mockSearchGroups: vi.fn(),
  mockGetGroup: vi.fn(),
  mockCreateGroup: vi.fn(),
  mockUpdateGroup: vi.fn(),
  mockGetUserIdByGuid: vi.fn(),
  mockGroupGetInstance: vi.fn(),
  mockUserGetInstance: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/groupService', () => ({
  GroupService: { getInstance: mockGroupGetInstance },
}));

vi.mock('@/services/userService', () => ({
  UserService: { getInstance: mockUserGetInstance },
}));

import {
  fetchGroupWizardLookups,
  searchContacts,
  searchGroups,
  fetchGroupRecord,
  createGroup,
  updateGroup,
} from './actions';
import type { GroupWizardFormData } from './schema';

const BASE_FORM: GroupWizardFormData = {
  Group_Name: 'Test Group',
  Group_Type_ID: 1,
  Description: null,
  Start_Date: '2024-01-01',
  End_Date: null,
  Reason_Ended: null,
  Congregation_ID: 1,
  Ministry_ID: 1,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGroupGetInstance.mockResolvedValue({
    fetchAllLookups: mockFetchAllLookups,
    searchContacts: mockSearchContacts,
    searchGroups: mockSearchGroups,
    getGroup: mockGetGroup,
    createGroup: mockCreateGroup,
    updateGroup: mockUpdateGroup,
  });
  mockUserGetInstance.mockResolvedValue({
    getUserIdByGuid: mockGetUserIdByGuid,
  });
});

describe('fetchGroupWizardLookups', () => {
  it('throws Unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(fetchGroupWizardLookups()).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when session has no user.id', async () => {
    mockGetSession.mockResolvedValueOnce({ user: {} });
    await expect(fetchGroupWizardLookups()).rejects.toThrow('Unauthorized');
  });

  it('returns lookups when authorized', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
    const lookups = { groupTypes: [{ id: 1, name: 'Small Group' }] };
    mockFetchAllLookups.mockResolvedValueOnce(lookups);

    const result = await fetchGroupWizardLookups();

    expect(result).toBe(lookups);
    expect(mockFetchAllLookups).toHaveBeenCalledTimes(1);
  });
});

describe('searchContacts', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('throws Unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(searchContacts('Jane')).rejects.toThrow('Unauthorized');
  });

  it('returns [] for empty term without calling service', async () => {
    const result = await searchContacts('');
    expect(result).toEqual([]);
    expect(mockSearchContacts).not.toHaveBeenCalled();
  });

  it('returns [] for 1-character term without calling service', async () => {
    const result = await searchContacts('J');
    expect(result).toEqual([]);
    expect(mockSearchContacts).not.toHaveBeenCalled();
  });

  it('delegates to service for 2+ character terms', async () => {
    const contacts = [{ Contact_ID: 1, Display_Name: 'Jane', Email_Address: null }];
    mockSearchContacts.mockResolvedValueOnce(contacts);

    const result = await searchContacts('Ja');

    expect(mockSearchContacts).toHaveBeenCalledWith('Ja');
    expect(result).toEqual(contacts);
  });
});

describe('searchGroups', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('throws Unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(searchGroups('Youth')).rejects.toThrow('Unauthorized');
  });

  it('returns [] for sub-2-character terms', async () => {
    expect(await searchGroups('')).toEqual([]);
    expect(await searchGroups('Y')).toEqual([]);
    expect(mockSearchGroups).not.toHaveBeenCalled();
  });

  it('delegates to service for 2+ character terms', async () => {
    const groups = [{ Group_ID: 1, Group_Name: 'Youth', Group_Type: 'Small' }];
    mockSearchGroups.mockResolvedValueOnce(groups);

    const result = await searchGroups('Yo');

    expect(mockSearchGroups).toHaveBeenCalledWith('Yo');
    expect(result).toEqual(groups);
  });
});

describe('fetchGroupRecord', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns success with data + displayNames on happy path', async () => {
    mockGetGroup.mockResolvedValueOnce({
      data: BASE_FORM,
      displayNames: {
        contacts: { 42: 'Jane Doe' },
        groups: { 77: 'Parent Group' },
      },
    });

    const result = await fetchGroupRecord(100);

    expect(result).toEqual({
      success: true,
      data: BASE_FORM,
      displayNames: { contacts: { 42: 'Jane Doe' }, groups: { 77: 'Parent Group' } },
    });
    expect(mockGetGroup).toHaveBeenCalledWith(100);
  });

  it('returns ActionError when group not found', async () => {
    mockGetGroup.mockResolvedValueOnce(null);

    const result = await fetchGroupRecord(999);

    expect(result).toEqual({ success: false, error: 'Group not found' });
  });

  it('returns ActionError when session fails', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await fetchGroupRecord(100);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns ActionError with message when service throws', async () => {
    mockGetGroup.mockRejectedValueOnce(new Error('DB failure'));

    const result = await fetchGroupRecord(100);

    expect(result).toEqual({ success: false, error: 'DB failure' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetGroup.mockRejectedValueOnce('string-err');

    const result = await fetchGroupRecord(100);

    expect(result).toEqual({ success: false, error: 'Failed to load group' });
  });
});

describe('createGroup', () => {
  it('throws Unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await createGroup(BASE_FORM);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns User GUID not found in session error when userGuid is absent', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });

    const result = await createGroup(BASE_FORM);

    expect(result).toEqual({ success: false, error: 'User GUID not found in session' });
    expect(mockCreateGroup).not.toHaveBeenCalled();
  });

  it('resolves MP user id and creates group on happy path', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockCreateGroup.mockResolvedValueOnce({ Group_ID: 200, Group_Name: 'Test Group' });

    const result = await createGroup(BASE_FORM);

    expect(mockGetUserIdByGuid).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(mockCreateGroup).toHaveBeenCalledWith(BASE_FORM, 42);
    expect(result).toEqual({ success: true, groupId: 200, groupName: 'Test Group' });
  });

  it('returns ActionError when createGroup throws', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockCreateGroup.mockRejectedValueOnce(new Error('MP create failed'));

    const result = await createGroup(BASE_FORM);

    expect(result).toEqual({ success: false, error: 'MP create failed' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockCreateGroup.mockRejectedValueOnce('boom');

    const result = await createGroup(BASE_FORM);

    expect(result).toEqual({ success: false, error: 'Failed to create group' });
  });
});

describe('updateGroup', () => {
  it('throws Unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await updateGroup(100, BASE_FORM);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns User GUID not found in session error when userGuid is absent', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });

    const result = await updateGroup(100, BASE_FORM);

    expect(result).toEqual({ success: false, error: 'User GUID not found in session' });
    expect(mockUpdateGroup).not.toHaveBeenCalled();
  });

  it('resolves MP user id and updates group on happy path', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockUpdateGroup.mockResolvedValueOnce({ Group_ID: 100, Group_Name: 'Updated' });

    const result = await updateGroup(100, BASE_FORM);

    expect(mockUpdateGroup).toHaveBeenCalledWith(100, BASE_FORM, 42);
    expect(result).toEqual({ success: true, groupId: 100, groupName: 'Updated' });
  });

  it('returns ActionError when updateGroup throws', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockUpdateGroup.mockRejectedValueOnce(new Error('MP update failed'));

    const result = await updateGroup(100, BASE_FORM);

    expect(result).toEqual({ success: false, error: 'MP update failed' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockUpdateGroup.mockRejectedValueOnce('boom');

    const result = await updateGroup(100, BASE_FORM);

    expect(result).toEqual({ success: false, error: 'Failed to update group' });
  });
});

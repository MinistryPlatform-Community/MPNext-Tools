import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetUserProfile, mockGetSession } = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserProfile: mockGetUserProfile,
    }),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { getCurrentUserProfile } from './user';

describe('getCurrentUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
  });

  it('should call UserService with correct ID', async () => {
    const mockProfile = {
      User_ID: 1,
      User_GUID: '550e8400-e29b-41d4-a716-446655440000',
      Contact_ID: 100,
      First_Name: 'John',
      Nickname: 'Johnny',
      Last_Name: 'Doe',
      Email_Address: 'john@example.com',
      Mobile_Phone: null,
      Image_GUID: null,
      roles: ['Admin'],
      userGroups: ['Staff'],
    };
    mockGetUserProfile.mockResolvedValueOnce(mockProfile);

    const result = await getCurrentUserProfile('550e8400-e29b-41d4-a716-446655440000');

    expect(mockGetUserProfile).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toEqual(mockProfile);
  });

  it('should throw when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getCurrentUserProfile('550e8400-e29b-41d4-a716-446655440000'))
      .rejects.toThrow('Unauthorized');
  });

  it('should propagate errors', async () => {
    mockGetUserProfile.mockRejectedValueOnce(new Error('Service error'));

    await expect(getCurrentUserProfile('550e8400-e29b-41d4-a716-446655440000'))
      .rejects.toThrow('Service error');
  });
});

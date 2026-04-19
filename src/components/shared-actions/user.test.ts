import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetUserProfile, mockGetSession, mockGetUserIdByGuid } = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetUserIdByGuid: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserProfile: mockGetUserProfile,
      getUserIdByGuid: mockGetUserIdByGuid,
    }),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { getCurrentUserProfile, getCurrentUserIdFromSession } from './user';

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

describe('getCurrentUserIdFromSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the MP User_ID via getUserIdByGuid', async () => {
    mockGetUserIdByGuid.mockResolvedValueOnce(42);

    const result = await getCurrentUserIdFromSession({
      user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    } as unknown as Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>);

    expect(mockGetUserIdByGuid).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe(42);
  });

  it('throws when session is null', async () => {
    await expect(
      getCurrentUserIdFromSession(
        null as unknown as Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>
      )
    ).rejects.toThrow('User GUID not found in session');
  });

  it('throws when session.user has no userGuid', async () => {
    await expect(
      getCurrentUserIdFromSession({
        user: { id: 'internal-id' },
      } as unknown as Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>)
    ).rejects.toThrow('User GUID not found in session');
    expect(mockGetUserIdByGuid).not.toHaveBeenCalled();
  });

  it('propagates errors from getUserIdByGuid', async () => {
    mockGetUserIdByGuid.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      getCurrentUserIdFromSession({
        user: { id: 'internal-id', userGuid: 'bogus' },
      } as unknown as Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>)
    ).rejects.toThrow('User not found');
  });
});

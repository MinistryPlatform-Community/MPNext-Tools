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

const SESSION_GUID = '550e8400-e29b-41d4-a716-446655440000';

describe('getCurrentUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      user: { id: 'internal-id', userGuid: SESSION_GUID },
    });
  });

  it("should look up the profile using the session's userGuid", async () => {
    const mockProfile = {
      User_ID: 1,
      User_GUID: SESSION_GUID,
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

    const result = await getCurrentUserProfile();

    expect(mockGetUserProfile).toHaveBeenCalledWith(SESSION_GUID);
    expect(result).toEqual(mockProfile);
  });

  it('should ignore any caller-supplied argument and use the session GUID', async () => {
    mockGetUserProfile.mockResolvedValueOnce(undefined);

    // The action takes no parameters; a caller forging one must not influence the lookup.
    await (getCurrentUserProfile as unknown as (id: string) => Promise<unknown>)(
      'attacker-supplied-guid'
    );

    expect(mockGetUserProfile).toHaveBeenCalledWith(SESSION_GUID);
    expect(mockGetUserProfile).not.toHaveBeenCalledWith('attacker-supplied-guid');
  });

  it('should throw when the session has no userGuid', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });

    await expect(getCurrentUserProfile()).rejects.toThrow('Unauthorized');
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  it('should throw when the session userGuid is an empty string', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id', userGuid: '' } });

    await expect(getCurrentUserProfile()).rejects.toThrow('Unauthorized');
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  it('should throw when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getCurrentUserProfile()).rejects.toThrow('Unauthorized');
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  it('should propagate errors', async () => {
    mockGetUserProfile.mockRejectedValueOnce(new Error('Service error'));

    await expect(getCurrentUserProfile()).rejects.toThrow('Service error');
  });
});

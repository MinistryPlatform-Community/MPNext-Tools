import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockGetUserIdByGuid, mockGetUserTools } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUserIdByGuid: vi.fn(),
  mockGetUserTools: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserIdByGuid: mockGetUserIdByGuid,
    }),
  },
}));

vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserTools: mockGetUserTools,
    }),
  },
}));

import { getUserTools } from './user-tools-actions';

describe('getUserTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await expect(getUserTools()).rejects.toThrow('Unauthorized');
  });

  it('should throw when userGuid is missing from session', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'internal-id' },
    });

    await expect(getUserTools()).rejects.toThrow('User GUID not found');
  });

  it('should throw when user not found in MP', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockRejectedValueOnce(new Error('User not found'));

    await expect(getUserTools()).rejects.toThrow('User not found');
  });

  it('should return tool paths when authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
    mockGetUserIdByGuid.mockResolvedValueOnce(42);
    mockGetUserTools.mockResolvedValueOnce(['/contacts', '/events']);

    const result = await getUserTools();

    expect(mockGetUserIdByGuid).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(mockGetUserTools).toHaveBeenCalledWith(42);
    expect(result).toEqual(['/contacts', '/events']);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';

const { mockUseSession, mockGetCurrentUserProfile } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockGetCurrentUserProfile: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
  },
}));

vi.mock('@/components/shared-actions/user', () => ({
  getCurrentUserProfile: mockGetCurrentUserProfile,
}));

import { UserProvider, useUser } from './user-context';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
  };
}

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUser', () => {
    it('should throw when used outside UserProvider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUser());
      }).toThrow('useUser must be used within a UserProvider');

      spy.mockRestore();
    });
  });

  describe('UserProvider', () => {
    it('should load profile when session has userGuid', async () => {
      const mockProfile = {
        User_ID: 1,
        User_GUID: 'guid-123',
        First_Name: 'John',
        Last_Name: 'Doe',
      };

      mockUseSession.mockReturnValue({
        data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
        isPending: false,
      });
      mockGetCurrentUserProfile.mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userProfile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(mockGetCurrentUserProfile).toHaveBeenCalledWith();
    });

    it('should set null profile when no session', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      });

      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
      expect(mockGetCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('should not fetch profile when session has no userGuid', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'internal-id' } },
        isPending: false,
      });

      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

      // When session exists but has no userGuid, neither effect branch triggers
      expect(result.current.userProfile).toBeNull();
      expect(mockGetCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('should handle profile load error', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
        isPending: false,
      });
      mockGetCurrentUserProfile.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should refresh profile when refreshUserProfile is called', async () => {
      const mockProfile = { User_ID: 1, User_GUID: 'guid-123', First_Name: 'John' };
      const updatedProfile = { User_ID: 1, User_GUID: 'guid-123', First_Name: 'Jane' };

      mockUseSession.mockReturnValue({
        data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
        isPending: false,
      });
      mockGetCurrentUserProfile
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(updatedProfile);

      const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.userProfile).toEqual(mockProfile);
      });

      await act(async () => {
        await result.current.refreshUserProfile();
      });

      expect(result.current.userProfile).toEqual(updatedProfile);
      expect(mockGetCurrentUserProfile).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Branches the mount effect alone cannot reach.
 *
 * The effect only calls `loadUserProfile()` when a `userGuid` exists, so the
 * guard clause inside that callback is reachable only through an explicit
 * `refreshUserProfile()` — which is exactly what happens if a component
 * refreshes while the session is still resolving or has gone stale.
 */
describe('UserProvider edge branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the profile without calling the server when refreshed with no userGuid', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'internal-id' } },
      isPending: false,
    });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.refreshUserProfile();
    });

    expect(mockGetCurrentUserProfile).not.toHaveBeenCalled();
    expect(result.current.userProfile).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('stays in the loading state while the session is pending', () => {
    mockUseSession.mockReturnValue({ data: undefined, isPending: true });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(mockGetCurrentUserProfile).not.toHaveBeenCalled();
  });

  it('wraps a non-Error rejection in a real Error', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
      isPending: false,
    });
    mockGetCurrentUserProfile.mockRejectedValueOnce('a bare string');

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to load user profile');
    expect(result.current.userProfile).toBeNull();
  });

  it('treats an undefined profile result as no profile', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
      isPending: false,
    });
    mockGetCurrentUserProfile.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userProfile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('clears a previous error on a successful refresh', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
      isPending: false,
    });
    mockGetCurrentUserProfile.mockRejectedValueOnce(new Error('transient'));

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    mockGetCurrentUserProfile.mockResolvedValueOnce({ Contact_ID: 7 });
    await act(async () => {
      await result.current.refreshUserProfile();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.userProfile).toEqual({ Contact_ID: 7 });
  });
});

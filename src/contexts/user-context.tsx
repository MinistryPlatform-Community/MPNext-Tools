"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { getCurrentUserProfile } from "@/components/shared-actions/user";

interface UserContextValue {
  userProfile: MPUserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshUserProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Internal: lets `useUser()` tell the provider that a consumer exists.
 * Kept in its own context so the public `useUser()` return shape is unchanged
 * and the stable callback never re-renders consumers.
 */
const UserProfileRequestContext = createContext<(() => void) | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

/**
 * Loads the signed-in user's MP display profile **lazily**: no
 * `getCurrentUserProfile()` call is made until a component calls `useUser()`.
 * The first consumer flips `requested`; later consumers share the same load
 * (setting `requested` to `true` again is a no-op re-render bail-out).
 */
export function UserProvider({ children }: UserProviderProps) {
  const { data: session, isPending } = authClient.useSession();
  const [requested, setRequested] = useState(false);
  const [userProfile, setUserProfile] = useState<MPUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // userGuid is the MP User_GUID stored as an additionalField on the Better Auth user.
  // Better Auth generates its own internal user.id, so we use userGuid for MP lookups.
  const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;

  const requestProfile = useCallback(() => setRequested(true), []);

  const loadUserProfile = useCallback(async () => {
    if (!userGuid) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const profile = await getCurrentUserProfile();
      setUserProfile(profile ?? null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load user profile"));
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userGuid]);

  useEffect(() => {
    if (!requested) return;
    if (!isPending && userGuid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUserProfile();
    } else if (!isPending && !session) {
      setUserProfile(null);
      setIsLoading(false);
    }
  }, [requested, userGuid, isPending, loadUserProfile, session]);

  const refreshUserProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  const value = useMemo(
    () => ({ userProfile, isLoading, error, refreshUserProfile }),
    [userProfile, isLoading, error, refreshUserProfile]
  );

  return (
    <UserProfileRequestContext.Provider value={requestProfile}>
      <UserContext.Provider value={value}>
        {children}
      </UserContext.Provider>
    </UserProfileRequestContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  const requestProfile = useContext(UserProfileRequestContext);

  // The first mounted consumer triggers the provider's one profile load.
  useEffect(() => {
    requestProfile?.();
  }, [requestProfile]);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

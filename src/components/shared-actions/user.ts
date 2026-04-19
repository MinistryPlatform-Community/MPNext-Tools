'use server';

import { auth } from '@/lib/auth';
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { UserService } from '@/services/userService';
import { headers } from 'next/headers';

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getCurrentUserProfile(id: string): Promise<MPUserProfile | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userService = await UserService.getInstance();
  const userProfile = await userService.getUserProfile(id);
  return userProfile;
}

/**
 * Resolves the numeric MP `User_ID` for the given Better Auth session by looking up
 * `session.user.userGuid` in `dp_Users`. Throws if the session has no user GUID.
 *
 * This is the canonical way for server actions to obtain the `$userId` value that
 * should be threaded through to MP write operations for audit attribution.
 */
export async function getCurrentUserIdFromSession(
  session: BetterAuthSession
): Promise<number> {
  const userGuid = (session?.user as Record<string, unknown> | undefined)?.userGuid as
    | string
    | undefined;
  if (!userGuid) throw new Error('User GUID not found in session');

  const userService = await UserService.getInstance();
  return userService.getUserIdByGuid(userGuid);
}

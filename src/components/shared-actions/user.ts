'use server';

import { auth } from '@/lib/auth';
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { UserService } from '@/services/userService';
import { headers } from 'next/headers';

/**
 * Returns the profile of the *calling* user only.
 *
 * Carve-out from the `AuthorizationService` gate (CLAUDE.md rule 12): this action
 * exposes no MP data other than the caller's own profile, so there is no role to
 * check beyond "is this a real MP identity".
 *
 * The GUID is derived from the session and MUST NOT become a parameter again.
 * Server actions are caller-shaped POST endpoints, so a `id`/`userGuid` argument
 * here was a live IDOR: any authenticated MP user could read another user's
 * contact details, roles, and user groups. Keeping it session-only makes the
 * carve-out's "own profile" justification enforceable by the type signature.
 *
 * The guard keys on `userGuid` (declared `required: true` in `src/lib/auth.ts`),
 * not `session.user.id` — the latter is Better Auth's internal ID and its presence
 * does not prove an MP identity exists.
 */
export async function getCurrentUserProfile(): Promise<MPUserProfile | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userGuid = (session?.user as Record<string, unknown> | undefined)?.userGuid;
  if (typeof userGuid !== 'string' || userGuid.length === 0) throw new Error('Unauthorized');

  const userService = await UserService.getInstance();
  return userService.getUserProfile(userGuid);
}

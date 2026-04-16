'use server';

import { auth } from '@/lib/auth';
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { UserService } from '@/services/userService';
import { headers } from 'next/headers';

export async function getCurrentUserProfile(id: string): Promise<MPUserProfile | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userService = await UserService.getInstance();
  const userProfile = await userService.getUserProfile(id);
  return userProfile;
}

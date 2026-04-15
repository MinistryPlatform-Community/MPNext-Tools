'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { MPHelper } from '@/lib/providers/ministry-platform';
import { GroupService } from '@/services/groupService';
import type {
  GroupWizardLookups,
  ContactSearchResult,
  GroupSearchResult,
  CreateGroupResult,
  UpdateGroupResult,
  ActionError,
} from './types';
import type { GroupWizardFormData } from './schema';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

async function getMPUserId(session: Awaited<ReturnType<typeof getSession>>): Promise<number> {
  const userGuid = (session.user as Record<string, unknown>).userGuid as string | undefined;
  if (!userGuid) throw new Error('User GUID not found in session');

  const mp = new MPHelper();
  const records = await mp.getTableRecords<{ User_ID: number }>({
    table: 'dp_Users',
    filter: `User_GUID = '${userGuid}'`,
    select: 'User_ID',
    top: 1,
  });

  if (!records || records.length === 0) throw new Error('MP user not found');
  return records[0].User_ID;
}

export async function fetchGroupWizardLookups(): Promise<GroupWizardLookups> {
  await getSession();
  const service = await GroupService.getInstance();
  return service.fetchAllLookups();
}

export async function searchContacts(term: string): Promise<ContactSearchResult[]> {
  await getSession();
  if (!term || term.length < 2) return [];
  const service = await GroupService.getInstance();
  return service.searchContacts(term);
}

export async function searchGroups(term: string): Promise<GroupSearchResult[]> {
  await getSession();
  if (!term || term.length < 2) return [];
  const service = await GroupService.getInstance();
  return service.searchGroups(term);
}

export async function fetchGroupRecord(
  groupId: number,
): Promise<{ success: true; data: GroupWizardFormData } | ActionError> {
  try {
    await getSession();
    const service = await GroupService.getInstance();
    const group = await service.getGroup(groupId);
    if (!group) return { success: false, error: 'Group not found' };
    return { success: true, data: group };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load group' };
  }
}

export async function createGroup(
  data: GroupWizardFormData,
): Promise<CreateGroupResult | ActionError> {
  try {
    const session = await getSession();
    const userId = await getMPUserId(session);
    const service = await GroupService.getInstance();
    const result = await service.createGroup(data, userId);
    return { success: true, groupId: result.Group_ID, groupName: result.Group_Name };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create group' };
  }
}

export async function updateGroup(
  groupId: number,
  data: GroupWizardFormData,
): Promise<UpdateGroupResult | ActionError> {
  try {
    const session = await getSession();
    const userId = await getMPUserId(session);
    const service = await GroupService.getInstance();
    const result = await service.updateGroup(groupId, data, userId);
    return { success: true, groupId: result.Group_ID, groupName: result.Group_Name };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update group' };
  }
}

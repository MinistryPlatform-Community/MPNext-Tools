'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { GroupService } from '@/services/groupService';
import { getCurrentUserIdFromSession } from '@/components/shared-actions/user';
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
): Promise<
  | {
      success: true;
      data: GroupWizardFormData;
      displayNames: { contacts: Record<number, string>; groups: Record<number, string> };
    }
  | ActionError
> {
  try {
    await getSession();
    const service = await GroupService.getInstance();
    const group = await service.getGroup(groupId);
    if (!group) return { success: false, error: 'Group not found' };
    return { success: true, data: group.data, displayNames: group.displayNames };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load group' };
  }
}

export async function createGroup(
  data: GroupWizardFormData,
): Promise<CreateGroupResult | ActionError> {
  try {
    const session = await getSession();
    const userId = await getCurrentUserIdFromSession(session);
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
    const userId = await getCurrentUserIdFromSession(session);
    const service = await GroupService.getInstance();
    const result = await service.updateGroup(groupId, data, userId);
    return { success: true, groupId: result.Group_ID, groupName: result.Group_Name };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update group' };
  }
}

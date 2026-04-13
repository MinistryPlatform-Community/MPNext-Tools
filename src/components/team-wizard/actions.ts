'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { GroupService } from '@/services/groupService';
import type { Groups } from '@/lib/providers/ministry-platform/models';
import type {
  TeamWizardLookupData,
  TeamWizardGroupData,
  ContactSearchResult,
  TeamWizardFormData,
  TeamWizardSaveResult,
} from '@/lib/dto';
import { GROUP_TYPE_QUICK_SERVE } from './schemas';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function loadWizardLookupData(): Promise<TeamWizardLookupData> {
  await getSession();
  const service = await GroupService.getInstance();

  const [ministries, groupFocuses, tags] = await Promise.all([
    service.getMinistries(),
    service.getGroupFocuses(),
    service.getGroupTags(),
  ]);

  return { ministries, groupFocuses, tags };
}

export async function loadGroupData(groupId: number): Promise<TeamWizardGroupData | null> {
  await getSession();
  const service = await GroupService.getInstance();

  const group = await service.getGroupWithDisplayName(groupId);
  if (!group) return null;

  const [tagRecords, address] = await Promise.all([
    service.getGroupTagRecords(groupId),
    group.Offsite_Meeting_Address
      ? loadOffsiteAddress()
      : Promise.resolve(null),
  ]);

  return {
    Group_ID: group.Group_ID,
    Group_Name: group.Group_Name,
    Group_Type_ID: group.Group_Type_ID,
    Description: group.Description ?? null,
    Start_Date: group.Start_Date,
    End_Date: group.End_Date ?? null,
    Target_Size: group.Target_Size ?? null,
    Congregation_ID: group.Congregation_ID,
    Ministry_ID: group.Ministry_ID,
    Group_Focus_ID: group.Group_Focus_ID ?? null,
    Primary_Contact: group.Primary_Contact,
    Primary_Contact_Display_Name: group.Primary_Contact_Display_Name,
    Registration_Start: group.Registration_Start ?? null,
    Registration_End: group.Registration_End ?? null,
    Available_Online: group.Available_Online,
    Offsite_Meeting_Address: group.Offsite_Meeting_Address ?? null,
    offsiteAddress: address,
    tagIds: tagRecords.map((t) => t.Tag_ID),
  };
}

async function loadOffsiteAddress() {
  // Address data would require a direct table read; for now return null
  // as the address fields can be re-entered if needed
  return null;
}

export async function searchContacts(term: string): Promise<ContactSearchResult[]> {
  await getSession();
  if (!term || term.trim().length < 2) return [];
  const service = await GroupService.getInstance();
  return await service.searchApprovedVolunteers(term.trim());
}

export async function saveTeamWizard(
  formData: TeamWizardFormData,
  existingGroupId?: number
): Promise<TeamWizardSaveResult> {
  try {
    await getSession();
    const service = await GroupService.getInstance();

    // 1. Build the group record
    let offsiteAddressId: number | undefined;
    if (
      formData.groupTypeId === GROUP_TYPE_QUICK_SERVE &&
      formData.meetingLocationOnCampus === false &&
      formData.offsiteAddress
    ) {
      offsiteAddressId = await service.createAddress(formData.offsiteAddress);
    }

    const groupRecord: Record<string, unknown> = {
      Group_Name: formData.groupName,
      Group_Type_ID: formData.groupTypeId,
      Description: formData.description,
      Start_Date: formData.startDate,
      End_Date: formData.endDate || null,
      Target_Size: formData.maxSize || null,
      Congregation_ID: formData.congregationId,
      Ministry_ID: formData.ministryId,
      Group_Focus_ID: formData.groupFocusId || null,
      Primary_Contact: formData.primaryContactId,
      Available_Online: formData.groupTypeId === GROUP_TYPE_QUICK_SERVE,
      Registration_Start: formData.registrationStart || null,
      Registration_End: formData.registrationEnd || null,
      Offsite_Meeting_Address: offsiteAddressId || null,
    };

    let groupId: number;

    if (existingGroupId && existingGroupId > 0) {
      // Update existing group
      groupRecord.Group_ID = existingGroupId;
      await service.updateGroup(groupRecord as Partial<Groups>);
      groupId = existingGroupId;
    } else {
      // Create new group
      const created = await service.createGroup(groupRecord as Partial<Groups>);
      groupId = created[0].Group_ID;
    }

    // 2. Handle leader
    await handleLeaderChange(service, groupId, formData.primaryContactId);

    // 3. Reconcile tags
    await reconcileTags(service, groupId, formData.tagIds);

    return { success: true, groupId };
  } catch (error) {
    console.error('saveTeamWizard error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

async function handleLeaderChange(
  service: GroupService,
  groupId: number,
  primaryContactId: number
): Promise<void> {
  // Check if a participant record exists for this contact
  const participant = await service.getParticipantByContactId(primaryContactId);
  const participantId = participant
    ? participant.Participant_ID
    : await service.createParticipant(primaryContactId);

  // Check current leader
  const currentLeader = await service.getGroupLeader(groupId);
  if (currentLeader && currentLeader.Contact_ID === primaryContactId) {
    // Same leader, no change needed
    return;
  }

  // End-date old leader if present
  if (currentLeader) {
    await service.endGroupLeader(currentLeader.Group_Participant_ID);
  }

  // Add new leader
  await service.addGroupLeader(groupId, participantId);
}

async function reconcileTags(
  service: GroupService,
  groupId: number,
  newTagIds: number[]
): Promise<void> {
  const existingTags = await service.getGroupTagRecords(groupId);
  const existingTagIds = existingTags.map((t) => t.Tag_ID);

  // Tags to add (in new but not in existing)
  const toAdd = newTagIds.filter((id) => !existingTagIds.includes(id));
  // Tags to remove (in existing but not in new)
  const toRemove = existingTags
    .filter((t) => !newTagIds.includes(t.Tag_ID))
    .map((t) => t.Group_Tag_ID);

  await Promise.all([
    service.addGroupTags(groupId, toAdd),
    service.removeGroupTags(toRemove),
  ]);
}

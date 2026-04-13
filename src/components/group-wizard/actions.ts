'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { GroupService } from '@/services/groupService';
import type { Groups } from '@/lib/providers/ministry-platform/models';
import type {
  GroupWizardLookupData,
  GroupWizardGroupData,
  GroupWizardFormData,
  GroupWizardSaveResult,
  ContactSearchResult,
  BookOption,
  RoomOption,
} from '@/lib/dto';
import {
  GROUP_TYPE_SMALL_GROUP,
  MEETING_TYPE_OFFSITE,
  MEETING_TYPE_ONLINE,
} from './schemas';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function loadGroupWizardLookupData(): Promise<GroupWizardLookupData> {
  await getSession();
  const service = await GroupService.getInstance();

  const [ministries, groupFocuses, tags, meetingDays, meetingFrequencies, meetingDurations] =
    await Promise.all([
      service.getMinistries(),
      service.getGroupFocuses(),
      service.getGroupTags(),
      service.getMeetingDays(),
      service.getMeetingFrequencies(),
      service.getMeetingDurations(),
    ]);

  return { ministries, groupFocuses, tags, meetingDays, meetingFrequencies, meetingDurations };
}

export async function loadGroupData(groupId: number): Promise<GroupWizardGroupData | null> {
  await getSession();
  const service = await GroupService.getInstance();

  const group = await service.getGroupWithDisplayName(groupId);
  if (!group) return null;

  const [tagRecords, address] = await Promise.all([
    service.getGroupTagRecords(groupId),
    group.Offsite_Meeting_Address
      ? service.getAddress(group.Offsite_Meeting_Address)
      : Promise.resolve(null),
  ]);

  return {
    Group_ID: group.Group_ID,
    Group_Name: group.Group_Name,
    Group_Type_ID: group.Group_Type_ID,
    Description: group.Description ?? null,
    Facebook_Group: group.Facebook_Group ?? null,
    Target_Size: group.Target_Size ?? null,
    Start_Date: group.Start_Date,
    End_Date: group.End_Date ?? null,
    Meeting_Day_ID: group.Meeting_Day_ID ?? null,
    Meeting_Frequency_ID: group.Meeting_Frequency_ID ?? null,
    Meeting_Time: group.Meeting_Time ?? null,
    Meeting_Duration_ID: group.Meeting_Duration_ID ?? null,
    Congregation_ID: group.Congregation_ID,
    Group_Meeting_Type_ID: group.Group_Meeting_Type_ID ?? null,
    Meets_Online: group.Meets_Online,
    Confidential: group.Confidential,
    Default_Room: group.Default_Room ?? null,
    Offsite_Meeting_Address: group.Offsite_Meeting_Address ?? null,
    offsiteAddress: address,
    Is_Child_Care_Available: group.Is_Child_Care_Available ?? false,
    Kids_Welcome: group.Kids_Welcome ?? false,
    Ministry_ID: group.Ministry_ID,
    Group_Focus_ID: group.Group_Focus_ID ?? null,
    Primary_Contact: group.Primary_Contact,
    Primary_Contact_Display_Name: group.Primary_Contact_Display_Name,
    Required_Book: group.Required_Book ?? null,
    Registration_Start: group.Registration_Start ?? null,
    Registration_End: group.Registration_End ?? null,
    Group_Is_Full: group.Group_Is_Full,
    Available_Online: group.Available_Online,
    tagIds: tagRecords.map((t) => t.Tag_ID),
  };
}

export async function searchContacts(term: string): Promise<ContactSearchResult[]> {
  await getSession();
  if (!term || term.trim().length < 2) return [];
  const service = await GroupService.getInstance();
  return await service.searchApprovedVolunteers(term.trim());
}

export async function searchBooks(term: string): Promise<BookOption[]> {
  await getSession();
  if (!term || term.trim().length < 2) return [];
  const service = await GroupService.getInstance();
  return await service.searchBooks(term.trim());
}

export async function loadRoomsByCongregation(congregationId: number): Promise<RoomOption[]> {
  await getSession();
  const service = await GroupService.getInstance();
  return await service.getRoomsByCongregation(congregationId);
}

export async function saveGroupWizard(
  formData: GroupWizardFormData,
  existingGroupId?: number
): Promise<GroupWizardSaveResult> {
  try {
    await getSession();
    const service = await GroupService.getInstance();

    // 1. Map children field to booleans
    const isChildCareAvailable = formData.children === 'care';
    const kidsWelcome = formData.children === 'welcome';

    // 2. Determine Meets_Online
    const meetsOnline = formData.meetingTypeId === MEETING_TYPE_ONLINE || formData.hybrid;

    // 3. Handle offsite address
    let offsiteAddressId: number | undefined;
    if (
      formData.meetingTypeId === MEETING_TYPE_OFFSITE &&
      formData.offsiteAddress
    ) {
      offsiteAddressId = await service.createAddress(formData.offsiteAddress);
    }

    // 4. Build group record
    const groupRecord: Record<string, unknown> = {
      Group_Name: formData.groupName,
      Group_Type_ID: GROUP_TYPE_SMALL_GROUP,
      Description: formData.description,
      Facebook_Group: formData.facebookGroup || null,
      Target_Size: formData.targetSize || null,
      Start_Date: formData.startDate,
      End_Date: formData.endDate || null,
      Meeting_Day_ID: formData.meetingDayId,
      Meeting_Frequency_ID: formData.meetingFrequencyId,
      Meeting_Time: formData.meetingTime,
      Meeting_Duration_ID: formData.meetingDurationId,
      Congregation_ID: formData.congregationId,
      Group_Meeting_Type_ID: formData.meetingTypeId,
      Meets_Online: meetsOnline,
      Confidential: formData.confidential,
      Default_Room: formData.defaultRoom || null,
      Offsite_Meeting_Address: offsiteAddressId || null,
      Is_Child_Care_Available: isChildCareAvailable,
      Kids_Welcome: kidsWelcome,
      Ministry_ID: formData.ministryId,
      Group_Focus_ID: formData.groupFocusId,
      Primary_Contact: formData.primaryContactId,
      Required_Book: formData.hasRequiredBook ? (formData.requiredBookId || null) : null,
      Registration_Start: formData.registrationStart || null,
      Registration_End: formData.registrationEnd || null,
      Group_Is_Full: formData.groupIsFull,
      Available_Online: true,
    };

    let groupId: number;

    if (existingGroupId && existingGroupId > 0) {
      groupRecord.Group_ID = existingGroupId;
      await service.updateGroup(groupRecord as Partial<Groups>);
      groupId = existingGroupId;
    } else {
      const created = await service.createGroup(groupRecord as Partial<Groups>);
      groupId = created[0].Group_ID;
    }

    // 5. Handle leader
    await handleLeaderChange(service, groupId, formData.primaryContactId);

    // 6. Reconcile tags
    await reconcileTags(service, groupId, formData.tagIds);

    return { success: true, groupId };
  } catch (error) {
    console.error('saveGroupWizard error:', error);
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
  const participant = await service.getParticipantByContactId(primaryContactId);
  const participantId = participant
    ? participant.Participant_ID
    : await service.createParticipant(primaryContactId);

  const currentLeader = await service.getGroupLeader(groupId);
  if (currentLeader && currentLeader.Contact_ID === primaryContactId) {
    return;
  }

  if (currentLeader) {
    await service.endGroupLeader(currentLeader.Group_Participant_ID);
  }

  await service.addGroupLeader(groupId, participantId);
}

async function reconcileTags(
  service: GroupService,
  groupId: number,
  newTagIds: number[]
): Promise<void> {
  const existingTags = await service.getGroupTagRecords(groupId);
  const existingTagIds = existingTags.map((t) => t.Tag_ID);

  const toAdd = newTagIds.filter((id) => !existingTagIds.includes(id));
  const toRemove = existingTags
    .filter((t) => !newTagIds.includes(t.Tag_ID))
    .map((t) => t.Group_Tag_ID);

  await Promise.all([
    service.addGroupTags(groupId, toAdd),
    service.removeGroupTags(toRemove),
  ]);
}

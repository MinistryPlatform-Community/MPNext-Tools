import { MPHelper } from '@/lib/providers/ministry-platform';
import type {
  MinistryOption,
  GroupFocusOption,
  TagOption,
  ContactSearchResult,
  OffsiteAddressData,
  MeetingDayOption,
  MeetingFrequencyOption,
  MeetingDurationOption,
  RoomOption,
  BookOption,
} from '@/lib/dto';
import type { Groups, GroupParticipants, GroupTags } from '@/lib/providers/ministry-platform/models';
import type { TableRecord } from '@/lib/providers/ministry-platform/types';
import { GROUP_ROLE_LEADER } from '@/components/team-wizard/schemas';

/**
 * GroupService - Singleton service for group-related Ministry Platform operations.
 * Used by Team Wizard server actions.
 */
export class GroupService {
  private static instance: GroupService;
  private mp: MPHelper | null = null;

  private constructor() {
    this.initialize();
  }

  public static async getInstance(): Promise<GroupService> {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService();
      await GroupService.instance.initialize();
    }
    return GroupService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  // ----------------------------------------------------------------
  // Lookup data
  // ----------------------------------------------------------------

  public async getMinistries(): Promise<MinistryOption[]> {
    return await this.mp!.getTableRecords<MinistryOption>({
      table: 'Ministries',
      select: 'Ministry_ID, Ministry_Name',
      filter: 'End_Date IS NULL',
      orderBy: 'Ministry_Name',
    });
  }

  public async getGroupFocuses(): Promise<GroupFocusOption[]> {
    return await this.mp!.getTableRecords<GroupFocusOption>({
      table: 'Group_Focuses',
      select: 'Group_Focus_ID, Group_Focus',
      filter: 'Group_Focus_ID IN (6, 7, 24)',
    });
  }

  public async getGroupTags(): Promise<TagOption[]> {
    return await this.mp!.getTableRecords<TagOption>({
      table: 'Tags',
      select: 'Tag_ID, Tag',
      filter: "Tag_Group = 'Groups'",
      orderBy: 'Tag',
    });
  }

  // ----------------------------------------------------------------
  // Contact search
  // ----------------------------------------------------------------

  public async searchApprovedVolunteers(term: string): Promise<ContactSearchResult[]> {
    const safeTerm = term.replace(/'/g, "''");
    return await this.mp!.getTableRecords<ContactSearchResult>({
      table: 'Contacts',
      select: 'Contacts.Contact_ID, Display_Name, Participant_Record_TABLE.Participant_ID',
      filter: `Display_Name LIKE '%${safeTerm}%' AND Contact_Status_ID = 1`,
      orderBy: 'Last_Name, First_Name',
      top: 20,
    });
  }

  // ----------------------------------------------------------------
  // Group CRUD
  // ----------------------------------------------------------------

  public async getGroup(groupId: number): Promise<Groups | null> {
    const records = await this.mp!.getTableRecords<Groups>({
      table: 'Groups',
      filter: `Group_ID = ${groupId}`,
      top: 1,
    });
    return records[0] ?? null;
  }

  public async getGroupWithDisplayName(groupId: number): Promise<(Groups & { Primary_Contact_Display_Name: string }) | null> {
    const records = await this.mp!.getTableRecords<Groups & { Primary_Contact_Display_Name: string }>({
      table: 'Groups',
      select: '*, Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name',
      filter: `Group_ID = ${groupId}`,
      top: 1,
    });
    return records[0] ?? null;
  }

  public async createGroup(data: Partial<Groups>): Promise<{ Group_ID: number; Group_Name: string }[]> {
    const records = await this.mp!.createTableRecords('Groups', [data as unknown as TableRecord], {
      $select: 'Group_ID, Group_Name',
    });
    return records as unknown as { Group_ID: number; Group_Name: string }[];
  }

  public async updateGroup(data: Partial<Groups>): Promise<void> {
    await this.mp!.updateTableRecords('Groups', [data as unknown as TableRecord]);
  }

  // ----------------------------------------------------------------
  // Address
  // ----------------------------------------------------------------

  public async createAddress(data: OffsiteAddressData): Promise<number> {
    const records = await this.mp!.createTableRecords<TableRecord>('Addresses', [{
      Address_Line_1: data.addressLine1,
      Address_Line_2: data.addressLine2 || null,
      City: data.city || null,
      'State/Region': data.state || null,
      Postal_Code: data.postalCode || null,
    } as unknown as TableRecord], {
      $select: 'Address_ID',
    });
    return (records[0] as unknown as { Address_ID: number }).Address_ID;
  }

  // ----------------------------------------------------------------
  // Participants & Leaders
  // ----------------------------------------------------------------

  public async getParticipantByContactId(contactId: number): Promise<{ Participant_ID: number } | null> {
    const records = await this.mp!.getTableRecords<{ Participant_ID: number }>({
      table: 'Participants',
      select: 'Participant_ID',
      filter: `Contact_ID = ${contactId}`,
      top: 1,
    });
    return records[0] ?? null;
  }

  public async createParticipant(contactId: number): Promise<number> {
    const records = await this.mp!.createTableRecords<TableRecord>('Participants', [{
      Contact_ID: contactId,
      Participant_Type_ID: 4, // Member
      Participant_Start_Date: new Date().toISOString(),
    } as unknown as TableRecord], {
      $select: 'Participant_ID',
    });
    return (records[0] as unknown as { Participant_ID: number }).Participant_ID;
  }

  public async getGroupLeader(groupId: number): Promise<(GroupParticipants & { Contact_ID: number }) | null> {
    const records = await this.mp!.getTableRecords<GroupParticipants & { Contact_ID: number }>({
      table: 'Group_Participants',
      select: 'Group_Participant_ID, Participant_ID_TABLE.Contact_ID, Group_Role_ID, Start_Date, End_Date',
      filter: `Group_ID = ${groupId} AND Group_Role_ID = ${GROUP_ROLE_LEADER} AND End_Date IS NULL`,
      top: 1,
    });
    return records[0] ?? null;
  }

  public async addGroupLeader(groupId: number, participantId: number): Promise<void> {
    await this.mp!.createTableRecords<TableRecord>('Group_Participants', [{
      Group_ID: groupId,
      Participant_ID: participantId,
      Group_Role_ID: GROUP_ROLE_LEADER,
      Start_Date: new Date().toISOString(),
    } as unknown as TableRecord]);
  }

  public async endGroupLeader(groupParticipantId: number): Promise<void> {
    await this.mp!.updateTableRecords<TableRecord>('Group_Participants', [{
      Group_Participant_ID: groupParticipantId,
      End_Date: new Date().toISOString(),
    } as unknown as TableRecord]);
  }

  // ----------------------------------------------------------------
  // Tags
  // ----------------------------------------------------------------

  public async getGroupTagRecords(groupId: number): Promise<GroupTags[]> {
    return await this.mp!.getTableRecords<GroupTags>({
      table: 'Group_Tags',
      select: 'Group_Tag_ID, Tag_ID, Group_ID',
      filter: `Group_ID = ${groupId}`,
    });
  }

  public async addGroupTags(groupId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;
    const records = tagIds.map((tagId) => ({
      Tag_ID: tagId,
      Group_ID: groupId,
    } as unknown as TableRecord));
    await this.mp!.createTableRecords<TableRecord>('Group_Tags', records);
  }

  public async removeGroupTags(groupTagIds: number[]): Promise<void> {
    if (groupTagIds.length === 0) return;
    await this.mp!.deleteTableRecords('Group_Tags', groupTagIds);
  }

  // ----------------------------------------------------------------
  // Meeting lookups (Group Wizard)
  // ----------------------------------------------------------------

  public async getMeetingDays(): Promise<MeetingDayOption[]> {
    return await this.mp!.getTableRecords<MeetingDayOption>({
      table: 'Meeting_Days',
      select: 'Meeting_Day_ID, Meeting_Day',
      orderBy: 'Meeting_Day_ID',
    });
  }

  public async getMeetingFrequencies(): Promise<MeetingFrequencyOption[]> {
    return await this.mp!.getTableRecords<MeetingFrequencyOption>({
      table: 'Meeting_Frequencies',
      select: 'Meeting_Frequency_ID, Meeting_Frequency',
      orderBy: 'Meeting_Frequency',
    });
  }

  public async getMeetingDurations(): Promise<MeetingDurationOption[]> {
    return await this.mp!.getTableRecords<MeetingDurationOption>({
      table: 'Meeting_Durations',
      select: 'Meeting_Duration_ID, Meeting_Duration',
      orderBy: 'Meeting_Duration',
    });
  }

  public async getRoomsByCongregation(congregationId: number): Promise<RoomOption[]> {
    return await this.mp!.getTableRecords<RoomOption>({
      table: 'Rooms',
      select: 'Room_ID, Room_Name, Building_ID_TABLE.Building_Name',
      filter: `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID = ${congregationId}`,
      orderBy: 'Building_ID_TABLE.Building_Name, Room_Name',
    });
  }

  public async searchBooks(term: string): Promise<BookOption[]> {
    const safeTerm = term.replace(/'/g, "''");
    return await this.mp!.getTableRecords<BookOption>({
      table: 'Books',
      select: 'Book_ID, Title, ISBN, Cost',
      filter: `Title LIKE '%${safeTerm}%' AND Active = 1`,
      orderBy: 'Title',
      top: 20,
    });
  }

  public async getAddress(addressId: number): Promise<OffsiteAddressData | null> {
    const records = await this.mp!.getTableRecords<{
      Address_Line_1: string;
      Address_Line_2: string | null;
      City: string | null;
      'State/Region': string | null;
      Postal_Code: string | null;
    }>({
      table: 'Addresses',
      select: 'Address_Line_1, Address_Line_2, City, [State/Region], Postal_Code',
      filter: `Address_ID = ${addressId}`,
      top: 1,
    });
    if (!records[0]) return null;
    const r = records[0];
    return {
      addressLine1: r.Address_Line_1,
      addressLine2: r.Address_Line_2 ?? undefined,
      city: r.City ?? undefined,
      state: r['State/Region'] ?? undefined,
      postalCode: r.Postal_Code ?? undefined,
    };
  }
}

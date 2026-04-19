import { MPHelper } from '@/lib/providers/ministry-platform';
import { escapeFilterString, validatePositiveInt } from '@/lib/validation';
import type {
  GroupWizardLookups,
  ContactSearchResult,
  GroupSearchResult,
} from '@/components/group-wizard/types';
import type { GroupWizardFormData } from '@/components/group-wizard/schema';

export interface GroupWizardDisplayNames {
  /** Map of Contact_ID → Display_Name for contact-typed fields */
  contacts: Record<number, string>;
  /** Map of Group_ID → Group_Name for group-typed fields */
  groups: Record<number, string>;
}

export interface GetGroupResult {
  data: GroupWizardFormData;
  displayNames: GroupWizardDisplayNames;
}

/** Convert date-only strings (YYYY-MM-DD) to ISO datetime for the MP API */
function toDatetime(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes('T')) return value;
  return `${value}T00:00:00Z`;
}

/** Prepare form data for the MP API by converting date fields to datetime */
function prepareForApi(data: GroupWizardFormData): Record<string, unknown> {
  return {
    ...data,
    Start_Date: toDatetime(data.Start_Date),
    End_Date: toDatetime(data.End_Date),
    Promotion_Date: toDatetime(data.Promotion_Date),
  };
}

export class GroupService {
  private static instance: GroupService;
  private mp: MPHelper | null = null;

  private constructor() {
    // Initialization is handled by getInstance()
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

  async fetchAllLookups(): Promise<GroupWizardLookups> {
    const [
      groupTypes,
      ministries,
      congregations,
      meetingDays,
      meetingFrequencies,
      meetingDurations,
      lifeStages,
      groupFocuses,
      priorities,
      rooms,
      books,
      smsNumbers,
      groupEndedReasons,
    ] = await Promise.all([
      this.mp!.getTableRecords<{ Group_Type_ID: number; Group_Type: string }>({
        table: 'Group_Types',
        select: 'Group_Type_ID, Group_Type',
        orderBy: 'Group_Type',
      }),
      this.mp!.getTableRecords<{ Ministry_ID: number; Ministry_Name: string }>({
        table: 'Ministries',
        select: 'Ministry_ID, Ministry_Name',
        filter: 'End_Date IS NULL',
        orderBy: 'Ministry_Name',
      }),
      this.mp!.getTableRecords<{ Congregation_ID: number; Congregation_Name: string }>({
        table: 'Congregations',
        select: 'Congregation_ID, Congregation_Name',
        filter: 'End_Date IS NULL',
        orderBy: 'Congregation_Name',
      }),
      this.mp!.getTableRecords<{ Meeting_Day_ID: number; Meeting_Day: string }>({
        table: 'Meeting_Days',
        select: 'Meeting_Day_ID, Meeting_Day',
        orderBy: 'Meeting_Day_ID',
      }),
      this.mp!.getTableRecords<{ Meeting_Frequency_ID: number; Meeting_Frequency: string }>({
        table: 'Meeting_Frequencies',
        select: 'Meeting_Frequency_ID, Meeting_Frequency',
        orderBy: 'Meeting_Frequency_ID',
      }),
      this.mp!.getTableRecords<{ Meeting_Duration_ID: number; Meeting_Duration: string }>({
        table: 'Meeting_Durations',
        select: 'Meeting_Duration_ID, Meeting_Duration',
        orderBy: 'Meeting_Duration_ID',
      }),
      this.mp!.getTableRecords<{ Life_Stage_ID: number; Life_Stage: string }>({
        table: 'Life_Stages',
        select: 'Life_Stage_ID, Life_Stage',
        orderBy: 'Life_Stage',
      }),
      this.mp!.getTableRecords<{ Group_Focus_ID: number; Group_Focus: string }>({
        table: 'Group_Focuses',
        select: 'Group_Focus_ID, Group_Focus',
        orderBy: 'Group_Focus',
      }),
      this.mp!.getTableRecords<{ Priority_ID: number; Priority_Name: string }>({
        table: 'Priorities',
        select: 'Priority_ID, Priority_Name',
        orderBy: 'Priority_Name',
      }),
      this.mp!.getTableRecords<{ Room_ID: number; Room_Name: string }>({
        table: 'Rooms',
        select: 'Room_ID, Room_Name',
        filter: 'Bookable = 1',
        orderBy: 'Room_Name',
      }),
      this.mp!.getTableRecords<{ Book_ID: number; Title: string }>({
        table: 'Books',
        select: 'Book_ID, Title',
        orderBy: 'Title',
      }),
      this.mp!.getTableRecords<{ SMS_Number_ID: number; Number_Title: string }>({
        table: 'dp_SMS_Numbers',
        select: 'SMS_Number_ID, Number_Title',
        filter: 'Active = 1',
        orderBy: 'Number_Title',
      }),
      this.mp!.getTableRecords<{ Group_Ended_Reason_ID: number; Group_Ended_Reason: string }>({
        table: 'Group_Ended_Reasons',
        select: 'Group_Ended_Reason_ID, Group_Ended_Reason',
        orderBy: 'Group_Ended_Reason',
      }),
    ]);

    return {
      groupTypes: groupTypes.map((r) => ({ id: r.Group_Type_ID, name: r.Group_Type })),
      ministries: ministries.map((r) => ({ id: r.Ministry_ID, name: r.Ministry_Name })),
      congregations: congregations.map((r) => ({ id: r.Congregation_ID, name: r.Congregation_Name })),
      meetingDays: meetingDays.map((r) => ({ id: r.Meeting_Day_ID, name: r.Meeting_Day })),
      meetingFrequencies: meetingFrequencies.map((r) => ({ id: r.Meeting_Frequency_ID, name: r.Meeting_Frequency })),
      meetingDurations: meetingDurations.map((r) => ({ id: r.Meeting_Duration_ID, name: r.Meeting_Duration })),
      lifeStages: lifeStages.map((r) => ({ id: r.Life_Stage_ID, name: r.Life_Stage })),
      groupFocuses: groupFocuses.map((r) => ({ id: r.Group_Focus_ID, name: r.Group_Focus })),
      priorities: priorities.map((r) => ({ id: r.Priority_ID, name: r.Priority_Name })),
      rooms: rooms.map((r) => ({ id: r.Room_ID, name: r.Room_Name })),
      books: books.map((r) => ({ id: r.Book_ID, name: r.Title })),
      smsNumbers: smsNumbers.map((r) => ({ id: r.SMS_Number_ID, name: r.Number_Title })),
      groupEndedReasons: groupEndedReasons.map((r) => ({ id: r.Group_Ended_Reason_ID, name: r.Group_Ended_Reason })),
    };
  }

  async searchContacts(term: string): Promise<ContactSearchResult[]> {
    const escaped = escapeFilterString(term);
    return this.mp!.getTableRecords<ContactSearchResult>({
      table: 'Contacts',
      select: 'Contact_ID, Display_Name, Email_Address',
      filter: `Display_Name LIKE '${escaped}%'`,
      orderBy: 'Display_Name',
      top: 20,
    });
  }

  async searchGroups(term: string): Promise<GroupSearchResult[]> {
    const escaped = escapeFilterString(term);
    return this.mp!.getTableRecords<GroupSearchResult>({
      table: 'Groups',
      select: 'Group_ID, Group_Name, Group_Type_ID_TABLE.Group_Type',
      filter: `Group_Name LIKE '${escaped}%' AND End_Date IS NULL`,
      orderBy: 'Group_Name',
      top: 20,
    });
  }

  async getGroup(groupId: number): Promise<GetGroupResult | null> {
    // Select all scalar fields plus display-name joins via FK table traversal.
    // Aliases (AS) keep the joined names on known keys so edit-mode can seed
    // the contact/group display maps without a second round trip.
    const records = await this.mp!.getTableRecords<Record<string, unknown>>({
      table: 'Groups',
      select: [
        'Groups.*',
        'Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name',
        'Parent_Group_TABLE.Group_Name AS Parent_Group_Name',
        'Promote_to_Group_TABLE.Group_Name AS Promote_to_Group_Name',
        'Descended_From_TABLE.Group_Name AS Descended_From_Name',
      ].join(', '),
      filter: `Groups.Group_ID = ${validatePositiveInt(groupId)}`,
      top: 1,
    });

    if (!records || records.length === 0) return null;

    const r = records[0];
    const data: GroupWizardFormData = {
      Group_Name: r.Group_Name as string,
      Group_Type_ID: r.Group_Type_ID as number,
      Description: (r.Description as string) ?? null,
      Start_Date: r.Start_Date ? (r.Start_Date as string).split('T')[0] : '',
      End_Date: r.End_Date ? (r.End_Date as string).split('T')[0] : null,
      Reason_Ended: (r.Reason_Ended as number) ?? null,
      Congregation_ID: r.Congregation_ID as number,
      Ministry_ID: r.Ministry_ID as number,
      Primary_Contact: r.Primary_Contact as number,
      Parent_Group: (r.Parent_Group as number) ?? null,
      Priority_ID: (r.Priority_ID as number) ?? null,
      Meeting_Day_ID: (r.Meeting_Day_ID as number) ?? null,
      Meeting_Time: (r.Meeting_Time as string) ?? null,
      Meeting_Frequency_ID: (r.Meeting_Frequency_ID as number) ?? null,
      Meeting_Duration_ID: (r.Meeting_Duration_ID as number) ?? null,
      Meets_Online: (r.Meets_Online as boolean) ?? false,
      Default_Meeting_Room: (r.Default_Meeting_Room as number) ?? null,
      Offsite_Meeting_Address: (r.Offsite_Meeting_Address as number) ?? null,
      Target_Size: (r.Target_Size as number) ?? null,
      Life_Stage_ID: (r.Life_Stage_ID as number) ?? null,
      Group_Focus_ID: (r.Group_Focus_ID as number) ?? null,
      Required_Book: (r.Required_Book as number) ?? null,
      SMS_Number: (r.SMS_Number as number) ?? null,
      Group_Is_Full: (r.Group_Is_Full as boolean) ?? false,
      Available_Online: (r.Available_Online as boolean) ?? false,
      Available_On_App: (r.Available_On_App as boolean) ?? null,
      Enable_Discussion: (r.Enable_Discussion as boolean) ?? false,
      Send_Attendance_Notification: (r.Send_Attendance_Notification as boolean) ?? false,
      Send_Service_Notification: (r.Send_Service_Notification as boolean) ?? false,
      Create_Next_Meeting: (r.Create_Next_Meeting as boolean) ?? false,
      'Secure_Check-in': (r['Secure_Check-in'] as boolean) ?? false,
      Suppress_Nametag: (r.Suppress_Nametag as boolean) ?? false,
      Suppress_Care_Note: (r.Suppress_Care_Note as boolean) ?? false,
      On_Classroom_Manager: (r.On_Classroom_Manager as boolean) ?? false,
      Promote_to_Group: (r.Promote_to_Group as number) ?? null,
      Age_in_Months_to_Promote: (r.Age_in_Months_to_Promote as number) ?? null,
      Promote_Weekly: (r.Promote_Weekly as boolean) ?? false,
      Promote_Participants_Only: (r.Promote_Participants_Only as boolean) ?? false,
      Promotion_Date: r.Promotion_Date ? (r.Promotion_Date as string).split('T')[0] : null,
      Descended_From: (r.Descended_From as number) ?? null,
    };

    const contacts: Record<number, string> = {};
    const groups: Record<number, string> = {};

    const primaryContactName = r.Primary_Contact_Display_Name as string | null | undefined;
    if (data.Primary_Contact && primaryContactName) {
      contacts[data.Primary_Contact] = primaryContactName;
    }

    const parentGroupName = r.Parent_Group_Name as string | null | undefined;
    if (data.Parent_Group && parentGroupName) {
      groups[data.Parent_Group] = parentGroupName;
    }

    const promoteToGroupName = r.Promote_to_Group_Name as string | null | undefined;
    if (data.Promote_to_Group && promoteToGroupName) {
      groups[data.Promote_to_Group] = promoteToGroupName;
    }

    const descendedFromName = r.Descended_From_Name as string | null | undefined;
    if (data.Descended_From && descendedFromName) {
      groups[data.Descended_From] = descendedFromName;
    }

    return { data, displayNames: { contacts, groups } };
  }

  async createGroup(
    data: GroupWizardFormData,
    userId: number,
  ): Promise<{ Group_ID: number; Group_Name: string }> {
    const apiData = prepareForApi(data);
    const result = await this.mp!.createTableRecords('Groups', [apiData], {
      $select: 'Group_ID, Group_Name',
      $userId: userId,
    });
    return result[0] as unknown as { Group_ID: number; Group_Name: string };
  }

  async updateGroup(
    groupId: number,
    data: Partial<GroupWizardFormData>,
    userId: number,
  ): Promise<{ Group_ID: number; Group_Name: string }> {
    const apiData = { Group_ID: groupId, ...prepareForApi(data as GroupWizardFormData) };
    const result = await this.mp!.updateTableRecords('Groups', [apiData], {
      partial: true,
      $select: 'Group_ID, Group_Name',
      $userId: userId,
    });
    return result[0] as unknown as { Group_ID: number; Group_Name: string };
  }
}

/**
 * DTOs for the Group Wizard feature (Small Groups).
 * These are hand-written application-level data transfer objects
 * used between server actions and UI components.
 *
 * Shared types reused from team-wizard.ts:
 *   MinistryOption, GroupFocusOption, TagOption, ContactSearchResult, OffsiteAddressData
 */

export interface MeetingDayOption {
  Meeting_Day_ID: number;
  Meeting_Day: string;
}

export interface MeetingFrequencyOption {
  Meeting_Frequency_ID: number;
  Meeting_Frequency: string;
}

export interface MeetingDurationOption {
  Meeting_Duration_ID: number;
  Meeting_Duration: string;
}

export interface RoomOption {
  Room_ID: number;
  Room_Name: string;
  Building_Name: string;
}

export interface BookOption {
  Book_ID: number;
  Title: string;
  ISBN?: string | null;
  Cost?: number | null;
}

export interface GroupWizardLookupData {
  ministries: import('./team-wizard').MinistryOption[];
  groupFocuses: import('./team-wizard').GroupFocusOption[];
  tags: import('./team-wizard').TagOption[];
  meetingDays: MeetingDayOption[];
  meetingFrequencies: MeetingFrequencyOption[];
  meetingDurations: MeetingDurationOption[];
}

export interface GroupWizardFormData {
  groupName: string;
  facebookGroup?: string;
  targetSize?: number;
  description: string;
  startDate: string;
  endDate?: string;
  meetingDayId: number;
  meetingFrequencyId: number;
  meetingTime: string;
  meetingDurationId: number;
  congregationId: number;
  meetingTypeId: number;
  hybrid: boolean;
  confidential: boolean;
  defaultRoom?: number;
  offsiteAddress?: import('./team-wizard').OffsiteAddressData;
  children: 'no' | 'care' | 'welcome';
  tagIds: number[];
  ministryId: number;
  groupFocusId: number;
  primaryContactId: number;
  hasRequiredBook: boolean;
  requiredBookId?: number;
  registrationStart: string;
  registrationEnd?: string;
  groupIsFull: boolean;
}

export interface GroupWizardGroupData {
  Group_ID: number;
  Group_Name: string;
  Group_Type_ID: number;
  Description: string | null;
  Facebook_Group: string | null;
  Target_Size: number | null;
  Start_Date: string;
  End_Date: string | null;
  Meeting_Day_ID: number | null;
  Meeting_Frequency_ID: number | null;
  Meeting_Time: string | null;
  Meeting_Duration_ID: number | null;
  Congregation_ID: number;
  Group_Meeting_Type_ID: number | null;
  Meets_Online: boolean;
  Confidential: boolean;
  Default_Room: number | null;
  Offsite_Meeting_Address: number | null;
  offsiteAddress: import('./team-wizard').OffsiteAddressData | null;
  Is_Child_Care_Available: boolean;
  Kids_Welcome: boolean;
  Ministry_ID: number;
  Group_Focus_ID: number | null;
  Primary_Contact: number;
  Primary_Contact_Display_Name: string;
  Required_Book: number | null;
  Registration_Start: string | null;
  Registration_End: string | null;
  Group_Is_Full: boolean;
  Available_Online: boolean;
  tagIds: number[];
}

export interface GroupWizardSaveResult {
  success: boolean;
  groupId?: number;
  error?: string;
}

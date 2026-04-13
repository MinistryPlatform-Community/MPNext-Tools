/**
 * DTOs for the Team Wizard feature.
 * These are hand-written application-level data transfer objects
 * used between server actions and UI components.
 */

export interface MinistryOption {
  Ministry_ID: number;
  Ministry_Name: string;
}

export interface GroupFocusOption {
  Group_Focus_ID: number;
  Group_Focus: string;
}

export interface TagOption {
  Tag_ID: number;
  Tag: string;
}

export interface ContactSearchResult {
  Contact_ID: number;
  Display_Name: string;
  Participant_ID: number | null;
}

export interface TeamWizardLookupData {
  ministries: MinistryOption[];
  groupFocuses: GroupFocusOption[];
  tags: TagOption[];
}

export interface OffsiteAddressData {
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface TeamWizardFormData {
  groupName: string;
  groupTypeId: number;
  description: string;
  startDate: string;
  endDate?: string;
  maxSize?: number;
  congregationId: number;
  ministryId: number;
  groupFocusId?: number;
  primaryContactId: number;
  tagIds: number[];
  registrationStart?: string;
  registrationEnd?: string;
  meetingLocationOnCampus?: boolean;
  offsiteAddress?: OffsiteAddressData;
}

export interface TeamWizardGroupData {
  Group_ID: number;
  Group_Name: string;
  Group_Type_ID: number;
  Description: string | null;
  Start_Date: string;
  End_Date: string | null;
  Target_Size: number | null;
  Congregation_ID: number;
  Ministry_ID: number;
  Group_Focus_ID: number | null;
  Primary_Contact: number;
  Primary_Contact_Display_Name: string;
  Registration_Start: string | null;
  Registration_End: string | null;
  Available_Online: boolean;
  Offsite_Meeting_Address: number | null;
  offsiteAddress: OffsiteAddressData | null;
  tagIds: number[];
}

export interface TeamWizardSaveResult {
  success: boolean;
  groupId?: number;
  error?: string;
}

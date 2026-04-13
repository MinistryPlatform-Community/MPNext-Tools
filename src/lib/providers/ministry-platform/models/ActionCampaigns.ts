/**
 * Interface for Action_Campaigns
* Table: Action_Campaigns
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ActionCampaigns {

  Action_Campaign_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Title: string /* max 150 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Body?: string /* max 2147483647 chars */ | null;

  Due_Date: string /* ISO datetime */;

  Follow_Up_Date?: string /* ISO datetime */ | null;

  Staff_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Staff_Types.Staff_Type_ID

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Report_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Report_Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;
}

export type ActionCampaignsRecord = ActionCampaigns;

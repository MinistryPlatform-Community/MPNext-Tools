/**
 * Interface for Ministries
* Table: Ministries
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Ministries {

  Ministry_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Ministry_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Nickname?: string /* max 50 chars */ | null;

  Primary_Contact: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Available_Online: boolean; // Has Default

  Parent_Ministry?: number /* 32-bit integer */ | null; // Foreign Key -> Ministries.Ministry_ID

  /**
   * Max length: 255 characters
   */
  Description?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Purpose_Statement?: string /* max 255 chars */ | null;

  Leadership_Team?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  /**
   * Max length: 254 characters
   */
  Home_Page_URL?: string /* max 254 chars */ | null;

  Priority_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Priorities.Priority_ID

  Background_Check_Required?: boolean | null;
}

export type MinistriesRecord = Ministries;

/**
 * Interface for Church_Stories
* Table: Church_Stories
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface ChurchStories {

  Church_Story_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  First_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Last_Name: string /* max 50 chars */;

  /**
   * Max length: 254 characters
   */
  Email_Address: string /* email, max 254 chars */;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Anonymous: boolean;

  /**
   * Max length: 2147483647 characters
   */
  Story?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Video_Url?: string /* max 255 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default
}

export type ChurchStoriesRecord = ChurchStories;

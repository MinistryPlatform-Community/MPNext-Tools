/**
 * Interface for Announcements
* Table: Announcements
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Announcements {

  Announcement_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Title: string /* max 128 chars */;

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Rank?: number /* 32-bit integer */ | null; // Has Default

  /**
   * Max length: 2147483647 characters
   */
  Announcement: string /* max 2147483647 chars */;

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date: string /* ISO datetime */; // Has Default

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Campus_Highlight: boolean; // Has Default

  Church_Highlight: boolean; // Has Default

  Event_ID?: number /* 32-bit integer */ | null;

  Group_ID?: number /* 32-bit integer */ | null;

  Ministry_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Ministries.Ministry_ID

  /**
   * Max length: 256 characters
   */
  Url_Link?: string /* max 256 chars */ | null;

  Web_Approved?: boolean | null;
}

export type AnnouncementsRecord = Announcements;

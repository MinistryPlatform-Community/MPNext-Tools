/**
 * Interface for Pocket_Platform_Announcements
* Table: Pocket_Platform_Announcements
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformAnnouncements {

  Announcement_ID: number /* 32-bit integer */; // Primary Key

  Announcement_Type_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Announcement_Types.Announcement_Type_ID, Has Default

  /**
   * Max length: 100 characters
   */
  Announcement_Title: string /* max 100 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Body?: string /* max 2147483647 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;

  Enabled: boolean; // Has Default

  /**
   * Max length: 255 characters
   */
  Link_URL?: string /* max 255 chars */ | null;

  Position?: number /* 32-bit integer */ | null;

  Dismissible?: boolean | null; // Has Default

  Congregation_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Congregations.Congregation_ID

  Audience_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Audiences.Audience_ID

  Show_Image_Only: boolean; // Has Default
}

export type PocketPlatformAnnouncementsRecord = PocketPlatformAnnouncements;

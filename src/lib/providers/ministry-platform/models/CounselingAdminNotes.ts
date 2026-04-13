/**
 * Interface for Counseling_Admin_Notes
* Table: Counseling_Admin_Notes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface CounselingAdminNotes {

  Counseling_Admin_Note_ID: number /* 32-bit integer */; // Primary Key

  Admin: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  /**
   * Max length: 2000 characters
   */
  Notes?: string /* max 2000 chars */ | null;

  Counseling_Engagement_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Engagements.Counseling_Engagement_ID

  Counseling_Session_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Counseling_Sessions.Counseling_Session_ID
}

export type CounselingAdminNotesRecord = CounselingAdminNotes;

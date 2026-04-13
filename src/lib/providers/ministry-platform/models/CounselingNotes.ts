/**
 * Interface for Counseling_Notes
* Table: Counseling_Notes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface CounselingNotes {

  Counseling_Note_ID: number /* 32-bit integer */; // Primary Key

  Counseling_Engagement_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Engagements.Counseling_Engagement_ID

  Made_By: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Counseling_Session_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Counseling_Sessions.Counseling_Session_ID

  /**
   * Max length: 2000 characters
   */
  Homework?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Counsel_Given?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Scripture?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Notes?: string /* max 2000 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default
}

export type CounselingNotesRecord = CounselingNotes;

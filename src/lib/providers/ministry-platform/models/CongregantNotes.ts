/**
 * Interface for Congregant_Notes
* Table: Congregant_Notes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CongregantNotes {

  Congregant_Note_ID: number /* 32-bit integer */; // Primary Key

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Start_Date: string /* ISO datetime */;

  Last_Updated: string /* ISO datetime */;

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID
}

export type CongregantNotesRecord = CongregantNotes;

/**
 * Interface for Scheduled_Changes
* Table: Scheduled_Changes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ScheduledChanges {

  Scheduled_Change_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Table_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Change_Type: string /* max 50 chars */;

  RecordID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 2048 characters
   */
  Data_Payload?: string /* max 2048 chars */ | null;

  Execution_Date: string /* ISO datetime */;
}

export type ScheduledChangesRecord = ScheduledChanges;

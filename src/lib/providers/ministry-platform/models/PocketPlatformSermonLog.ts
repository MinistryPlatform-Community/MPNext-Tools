/**
 * Interface for Pocket_Platform_Sermon_Log
* Table: Pocket_Platform_Sermon_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface PocketPlatformSermonLog {

  Sermon_Log_ID: number /* 32-bit integer */; // Primary Key

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Start_Date: string /* ISO datetime */; // Has Default

  /**
   * Max length: 50 characters
   */
  Source: string /* max 50 chars */;

  /**
   * Max length: 2000 characters
   */
  Data: string /* max 2000 chars */;
}

export type PocketPlatformSermonLogRecord = PocketPlatformSermonLog;

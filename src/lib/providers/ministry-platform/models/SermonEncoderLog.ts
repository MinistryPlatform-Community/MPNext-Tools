/**
 * Interface for Sermon_Encoder_Log
* Table: Sermon_Encoder_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SermonEncoderLog {

  Sermon_Encoder_Log_ID: number /* 32-bit integer */; // Primary Key, Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  /**
   * Max length: 256 characters
   */
  Message: string /* max 256 chars */;

  User_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Users.User_ID

  Start_Date: string /* ISO datetime */; // Has Default
}

export type SermonEncoderLogRecord = SermonEncoderLog;

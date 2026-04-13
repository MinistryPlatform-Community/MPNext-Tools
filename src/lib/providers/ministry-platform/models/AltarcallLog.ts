/**
 * Interface for AltarCall_Log
* Table: AltarCall_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface AltarcallLog {

  AltarCall_Log_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  CallSid: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Caller: string /* max 50 chars */;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Call_Started: string /* ISO datetime */; // Has Default

  Call_Ended?: string /* ISO datetime */ | null;

  Hold_Count: number /* 32-bit integer */; // Has Default

  Agent?: number /* 32-bit integer */ | null; // Foreign Key -> AltarCall_Contacts.AltarCall_Contact_ID

  /**
   * Max length: 50 characters
   */
  Status?: string /* max 50 chars */ | null;

  /**
   * Max length: 256 characters
   */
  RecordingUrl?: string /* max 256 chars */ | null;

  /**
   * Max length: 2048 characters
   */
  RecordingText?: string /* max 2048 chars */ | null;

  RequiresFollowUp: boolean; // Has Default
}

export type AltarcallLogRecord = AltarcallLog;

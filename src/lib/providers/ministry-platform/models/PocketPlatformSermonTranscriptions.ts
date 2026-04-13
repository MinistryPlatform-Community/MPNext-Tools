/**
 * Interface for Pocket_Platform_Sermon_Transcriptions
* Table: Pocket_Platform_Sermon_Transcriptions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface PocketPlatformSermonTranscriptions {

  Pocket_Platform_Sermon_Transcription_ID: number /* 32-bit integer */; // Primary Key

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  /**
   * Max length: 256 characters
   */
  Title?: string /* max 256 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Language: string /* max 50 chars */; // Has Default

  Start_Date: string /* ISO datetime */; // Has Default

  /**
   * Max length: 2147483647 characters
   */
  Transcription?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  SRT_Data?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Weekly_Challenge?: string /* max 2000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Group_Questions?: string /* max 4000 chars */ | null;
}

export type PocketPlatformSermonTranscriptionsRecord = PocketPlatformSermonTranscriptions;

/**
 * Interface for Worship_Songs
* Table: Worship_Songs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface WorshipSongs {

  Worship_Song_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 256 characters
   */
  Title: string /* max 256 chars */;

  /**
   * Max length: 128 characters
   */
  Artist?: string /* max 128 chars */ | null;

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  /**
   * Max length: 384 characters
   */
  HLS_Video?: string /* max 384 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  New_Until?: string /* ISO datetime */ | null;

  Sort_Order?: number /* 32-bit integer */ | null;

  Active: boolean; // Has Default
}

export type WorshipSongsRecord = WorshipSongs;

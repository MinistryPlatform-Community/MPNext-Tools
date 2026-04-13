/**
 * Interface for SMW_Days
* Table: SMW_Days
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmwDays {

  SMW_Day_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Title: string /* max 50 chars */;

  Day: number /* 32-bit integer */;

  /**
   * Max length: 256 characters
   */
  Video_File?: string /* max 256 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Social_Image_File?: string /* max 256 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Video_Image_File?: string /* max 256 chars */ | null;

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Milestone_ID: number /* 32-bit integer */; // Foreign Key -> Milestones.Milestone_ID

  /**
   * Max length: 128 characters
   */
  Scripture_Reference?: string /* max 128 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Scripture?: string /* max 512 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  HTML_Content?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Additional_Video_File?: string /* max 256 chars */ | null;

  Id: string /* GUID/UUID */; // Has Default

  Watched: number /* 32-bit integer */; // Has Default
}

export type SmwDaysRecord = SmwDays;

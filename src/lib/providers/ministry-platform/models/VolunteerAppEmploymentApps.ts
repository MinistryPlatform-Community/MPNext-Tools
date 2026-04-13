/**
 * Interface for Volunteer_App_Employment_Apps
* Table: Volunteer_App_Employment_Apps
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface VolunteerAppEmploymentApps {

  Volunteer_App_Employment_App_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  Operate_Computer: boolean; // Has Default

  Word: boolean; // Has Default

  Excel: boolean; // Has Default

  Powerpoint: boolean; // Has Default

  /**
   * Max length: 512 characters
   */
  Other_Skills?: string /* max 512 chars */ | null;

  Emp_Circumstance: boolean; // Has Default

  /**
   * Max length: 512 characters
   */
  Emp_Circumstance_Reason?: string /* max 512 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Expected_Salary?: string /* max 256 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Resume?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Cover_Letter?: string /* max 2147483647 chars */ | null;
}

export type VolunteerAppEmploymentAppsRecord = VolunteerAppEmploymentApps;

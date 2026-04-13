/**
 * Interface for Volunteer_App_Employers
* Table: Volunteer_App_Employers
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface VolunteerAppEmployers {

  Volunteer_App_Employer_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_Employment_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_App_Employment_Apps.Volunteer_App_Employment_App_ID

  /**
   * Max length: 50 characters
   */
  Employer?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Employer_Type?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Position?: string /* max 50 chars */ | null;

  Still_Employed?: boolean | null;

  Employment_Start_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  Employment_End_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  /**
   * Max length: 256 characters
   */
  Reason_For_Leaving?: string /* max 256 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Supervisor?: string /* max 128 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Company_Address?: string /* max 512 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Phone?: string /* max 50 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Salary?: string /* max 256 chars */ | null;
}

export type VolunteerAppEmployersRecord = VolunteerAppEmployers;

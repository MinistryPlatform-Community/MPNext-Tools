/**
 * Interface for Volunteer_App_Schools
* Table: Volunteer_App_Schools
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppSchools {

  Volunteer_App_School_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_Employment_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_App_Employment_Apps.Volunteer_App_Employment_App_ID

  /**
   * Max length: 50 characters
   */
  School_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Grade_Complete?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Major?: string /* max 50 chars */ | null;

  Completion_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  /**
   * Max length: 512 characters
   */
  School_Address?: string /* max 512 chars */ | null;
}

export type VolunteerAppSchoolsRecord = VolunteerAppSchools;

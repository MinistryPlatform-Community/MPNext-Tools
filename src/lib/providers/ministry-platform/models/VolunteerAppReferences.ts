/**
 * Interface for Volunteer_App_References
* Table: Volunteer_App_References
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppReferences {

  Reference_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  /**
   * Max length: 150 characters
   */
  Name: string /* max 150 chars */;

  /**
   * Max length: 30 characters
   */
  Phone?: string /* max 30 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Email?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Know_How?: string /* max 255 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 255 characters
   */
  How_Well_Know?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Do_You_Recommend?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Recommend_With_Kids?: string /* max 255 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  Date_Completed?: string /* ISO datetime */ | null;

  Reference_GUID: string /* GUID/UUID */; // Has Default

  /**
   * Max length: 50 characters
   */
  Source?: string /* max 50 chars */ | null;

  Reference_Type: number /* 32-bit integer */; // Foreign Key -> Volunteer_App_Reference_Types.Volunteer_App_Reference_Type_ID, Has Default
}

export type VolunteerAppReferencesRecord = VolunteerAppReferences;

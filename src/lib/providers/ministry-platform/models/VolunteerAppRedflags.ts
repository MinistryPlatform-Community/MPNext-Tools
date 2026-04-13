/**
 * Interface for Volunteer_App_RedFlags
* Table: Volunteer_App_RedFlags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppRedflags {

  Red_Flag_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  /**
   * Max length: 2048 characters
   */
  Notes?: string /* max 2048 chars */ | null;

  Red_Flag_Status_ID: number /* 32-bit integer */; // Foreign Key -> Red_Flag_Statuses.Red_Flag_Status_ID

  Start_Date: string /* ISO datetime */; // Has Default
}

export type VolunteerAppRedflagsRecord = VolunteerAppRedflags;

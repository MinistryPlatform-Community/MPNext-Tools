/**
 * Interface for Volunteer_App_Programs
* Table: Volunteer_App_Programs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppPrograms {

  Volunteer_App_Program_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  Program_ID: number /* 32-bit integer */; // Foreign Key -> Programs.Program_ID

  Start_Date: string /* ISO datetime */;

  Date_Placed?: string /* ISO datetime */ | null;

  End_Date?: string /* ISO datetime */ | null;

  Placement_Status_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Volunteer_App_Placement_Statuses.Placement_Status_ID

  /**
   * Max length: 1024 characters
   */
  Notes?: string /* max 1024 chars */ | null;

  /**
   * Max length: 1024 characters
   */
  Custom_App_Answer?: string /* max 1024 chars */ | null;

  Opportunity_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Opportunities.Opportunity_ID
}

export type VolunteerAppProgramsRecord = VolunteerAppPrograms;

/**
 * Interface for Volunteer_Training
* Table: Volunteer_Training
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface VolunteerTraining {

  Training_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Training_Name: string /* max 150 chars */;

  /**
   * Max length: 2048 characters
   */
  Description?: string /* max 2048 chars */ | null;

  Renewal_Days?: number /* 32-bit integer */ | null;

  Minimum_Score?: number /* decimal */ | null;

  Training_GUID: string /* GUID/UUID */; // Has Default
}

export type VolunteerTrainingRecord = VolunteerTraining;

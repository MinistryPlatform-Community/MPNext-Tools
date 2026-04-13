/**
 * Interface for Volunteer_Training_Media
* Table: Volunteer_Training_Media
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerTrainingMedia {

  Volunteer_Training_Media_ID: number /* 32-bit integer */; // Primary Key

  Training_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Training.Training_ID

  /**
   * Max length: 128 characters
   */
  Media_Title: string /* max 128 chars */;

  /**
   * Max length: 256 characters
   */
  Media_Url: string /* max 256 chars */;

  Sort_Order?: number /* 32-bit integer */ | null;
}

export type VolunteerTrainingMediaRecord = VolunteerTrainingMedia;

/**
 * Interface for Volunteer_Training_Requirements
* Table: Volunteer_Training_Requirements
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerTrainingRequirements {

  Volunteer_Training_Requirement_ID: number /* 32-bit integer */; // Primary Key

  Training_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Training.Training_ID

  Program_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Programs.Program_ID

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID
}

export type VolunteerTrainingRequirementsRecord = VolunteerTrainingRequirements;

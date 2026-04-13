/**
 * Interface for Volunteer_App_Trainings
* Table: Volunteer_App_Trainings
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface VolunteerAppTrainings {

  Volunteer_App_Training_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  Training_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Training.Training_ID

  Start_Date: string /* ISO datetime */; // Has Default

  Completion_Date?: string /* ISO datetime */ | null;

  Training_Score?: number /* decimal */ | null;

  Vol_Training_Guid: string /* GUID/UUID */; // Has Default
}

export type VolunteerAppTrainingsRecord = VolunteerAppTrainings;

/**
 * Interface for Volunteer_Areas
* Table: Volunteer_Areas
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAreas {

  Volunteer_Area_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Volunteer_Area: string /* max 50 chars */;

  Active: boolean; // Has Default
}

export type VolunteerAreasRecord = VolunteerAreas;

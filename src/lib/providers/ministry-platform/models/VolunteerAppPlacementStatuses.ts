/**
 * Interface for Volunteer_App_Placement_Statuses
* Table: Volunteer_App_Placement_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppPlacementStatuses {

  Placement_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Placement_Status: string /* max 128 chars */;
}

export type VolunteerAppPlacementStatusesRecord = VolunteerAppPlacementStatuses;

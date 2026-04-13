/**
 * Interface for Volunteer_App_Statuses
* Table: Volunteer_App_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppStatuses {

  Volunteer_App_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Status: string /* max 128 chars */;
}

export type VolunteerAppStatusesRecord = VolunteerAppStatuses;

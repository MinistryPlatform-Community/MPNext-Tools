/**
 * Interface for Volunteer_App_Status_Reasons
* Table: Volunteer_App_Status_Reasons
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppStatusReasons {

  Status_Reason_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Status_Reason: string /* max 50 chars */;
}

export type VolunteerAppStatusReasonsRecord = VolunteerAppStatusReasons;

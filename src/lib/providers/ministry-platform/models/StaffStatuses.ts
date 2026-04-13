/**
 * Interface for Staff_Statuses
* Table: Staff_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StaffStatuses {

  Staff_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Staff_Status: string /* max 50 chars */;
}

export type StaffStatusesRecord = StaffStatuses;

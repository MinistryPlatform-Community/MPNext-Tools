/**
 * Interface for College_Statuses
* Table: College_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeStatuses {

  College_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  College_Status: string /* max 50 chars */;
}

export type CollegeStatusesRecord = CollegeStatuses;

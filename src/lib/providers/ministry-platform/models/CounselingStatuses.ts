/**
 * Interface for Counseling_Statuses
* Table: Counseling_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface CounselingStatuses {

  Counseling_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Counseling_Status: string /* max 128 chars */;
}

export type CounselingStatusesRecord = CounselingStatuses;

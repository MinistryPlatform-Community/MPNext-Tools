/**
 * Interface for Discipleship_Statuses
* Table: Discipleship_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface DiscipleshipStatuses {

  Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Status: string /* max 50 chars */;
}

export type DiscipleshipStatusesRecord = DiscipleshipStatuses;

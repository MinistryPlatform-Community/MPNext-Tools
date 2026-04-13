/**
 * Interface for FLSA_Statuses
* Table: FLSA_Statuses
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface FlsaStatuses {

  FLSA_Status_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  FLSA_Status: string /* max 128 chars */;
}

export type FlsaStatusesRecord = FlsaStatuses;

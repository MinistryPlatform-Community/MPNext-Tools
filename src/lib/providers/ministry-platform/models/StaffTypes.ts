/**
 * Interface for Staff_Types
* Table: Staff_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StaffTypes {

  Staff_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Staff_Type: string /* max 50 chars */;
}

export type StaffTypesRecord = StaffTypes;

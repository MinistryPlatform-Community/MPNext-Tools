/**
 * Interface for Counseling_Session_Types
* Table: Counseling_Session_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface CounselingSessionTypes {

  Counseling_Session_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Counseling_Session_Type: string /* max 50 chars */;
}

export type CounselingSessionTypesRecord = CounselingSessionTypes;

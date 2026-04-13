/**
 * Interface for vw_CCM_ProgramVolunteerCounts
* Table: vw_CCM_ProgramVolunteerCounts
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VwCcmProgramvolunteercounts {

  Program_ID: number /* 32-bit integer */; // Primary Key

  Count?: number /* 32-bit integer */ | null;

  /**
   * Max length: 130 characters
   */
  Program_Name: string /* max 130 chars */;

  /**
   * Max length: 50 characters
   */
  Congregation_Name: string /* max 50 chars */;
}

export type VwCcmProgramvolunteercountsRecord = VwCcmProgramvolunteercounts;

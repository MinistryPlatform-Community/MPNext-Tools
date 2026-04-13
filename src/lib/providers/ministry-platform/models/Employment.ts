/**
 * Interface for Employment
* Table: Employment
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Employment {

  Employment_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Title: string /* max 128 chars */;

  /**
   * Max length: 75 characters
   */
  Reports_To?: string /* max 75 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Description: string /* max 512 chars */;

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Ministry_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Ministries.Ministry_ID

  FLSA_Status_ID: number /* 32-bit integer */; // Foreign Key -> FLSA_Statuses.FLSA_Status_ID

  /**
   * Max length: 128 characters
   */
  Hours?: string /* max 128 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Responsibilities?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Required_Skills?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Expectations?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Other_Qualifications?: string /* max 2147483647 chars */ | null;

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;
}

export type EmploymentRecord = Employment;

/**
 * Interface for Program_Refreshments
* Table: Program_Refreshments
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ProgramRefreshments {

  Program_Refreshment_ID: number /* 32-bit integer */; // Primary Key

  Program_ID: number /* 32-bit integer */; // Foreign Key -> Programs.Program_ID

  Requestor: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Date: string /* ISO date (YYYY-MM-DD) */;

  Amount: number /* currency amount */;

  /**
   * Max length: 250 characters
   */
  Location: string /* max 250 chars */;

  /**
   * Max length: 512 characters
   */
  Purpose: string /* max 512 chars */;

  People_Attending: number /* 16-bit integer */;
}

export type ProgramRefreshmentsRecord = ProgramRefreshments;

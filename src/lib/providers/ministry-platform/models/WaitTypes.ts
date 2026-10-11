/**
 * Interface for Wait_Types
* Table: Wait_Types
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface WaitTypes {

  Wait_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 60 characters
   */
  Wait_Type: string /* max 60 chars */;

  /**
   * Max length: 60 characters
   */
  Category: string /* max 60 chars */;
}

export type WaitTypesRecord = WaitTypes;

/**
 * Interface for Bible_College_Payment_Types
* Table: Bible_College_Payment_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface BibleCollegePaymentTypes {

  Bible_College_Payment_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Payment_Name: string /* max 50 chars */;
}

export type BibleCollegePaymentTypesRecord = BibleCollegePaymentTypes;

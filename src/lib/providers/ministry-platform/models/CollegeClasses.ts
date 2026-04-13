/**
 * Interface for College_Classes
* Table: College_Classes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeClasses {

  Class_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 100 characters
   */
  Class_Name: string /* max 100 chars */;

  /**
   * Max length: 50 characters
   */
  Course_Number: string /* max 50 chars */;
}

export type CollegeClassesRecord = CollegeClasses;

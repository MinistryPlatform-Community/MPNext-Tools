/**
 * Interface for College_Grades
* Table: College_Grades
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeGrades {

  Grade_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Grade_Text: string /* max 50 chars */;

  Grade_Points?: number /* decimal */ | null;

  Grade_Factored: boolean; // Has Default

  Credit_Conferred?: boolean | null;
}

export type CollegeGradesRecord = CollegeGrades;

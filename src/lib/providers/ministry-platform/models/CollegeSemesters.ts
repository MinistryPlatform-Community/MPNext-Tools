/**
 * Interface for College_Semesters
* Table: College_Semesters
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeSemesters {

  Semester_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Semester_Name: string /* max 50 chars */;

  Semester_Start: string /* ISO datetime */;

  Semester_End: string /* ISO datetime */;

  Semester_Number?: number /* decimal */ | null;

  /**
   * Max length: 6 characters
   */
  Usage_Code?: string /* max 6 chars */ | null;

  /**
   * Max length: 20 characters
   */
  Semester_Tittle?: string /* max 20 chars */ | null;

  Semester_Begin_Date?: string /* ISO datetime */ | null;

  Semester_End_Date?: string /* ISO datetime */ | null;
}

export type CollegeSemestersRecord = CollegeSemesters;

/**
 * Interface for College_Semester_Classes
* Table: College_Semester_Classes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeSemesterClasses {

  Semester_Class_ID: number /* 32-bit integer */; // Primary Key

  Semester_ID: number /* 32-bit integer */; // Foreign Key -> College_Semesters.Semester_ID

  Class_ID: number /* 32-bit integer */; // Foreign Key -> College_Classes.Class_ID

  Instructor_ID?: number /* 32-bit integer */ | null; // Foreign Key -> College_Instructors.Instructor_ID

  /**
   * Max length: 50 characters
   */
  Meets_On?: string /* max 50 chars */ | null;

  Room_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Rooms.Room_ID

  Campus?: number /* 32-bit integer */ | null; // Foreign Key -> Congregations.Congregation_ID

  Class_Credits?: number /* decimal */ | null;

  Class_Id_Number?: number /* 32-bit integer */ | null;

  Semester_Number?: number /* decimal */ | null;

  /**
   * Max length: 50 characters
   */
  Class_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 1 characters
   */
  Class_Type?: string /* max 1 chars */ | null;

  Instructor_Id_Number?: number /* 32-bit integer */ | null;

  Class_Campus_Id_Number?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Class_Facility?: string /* max 50 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Class_Location?: string /* max 255 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Class_Days_And_Times?: string /* max 70 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Class_Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Create_User?: string /* max 50 chars */ | null;

  Create_date?: string /* ISO datetime */ | null;
}

export type CollegeSemesterClassesRecord = CollegeSemesterClasses;

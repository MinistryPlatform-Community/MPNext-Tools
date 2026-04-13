/**
 * Interface for College_Student_Schedules
* Table: College_Student_Schedules
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeStudentSchedules {

  Student_Schedule_ID: number /* 32-bit integer */; // Primary Key

  Student_ID: number /* 32-bit integer */; // Foreign Key -> College_Students.Student_ID

  Semester_Class_ID: number /* 32-bit integer */; // Foreign Key -> College_Semester_Classes.Semester_Class_ID

  Grade_ID?: number /* 32-bit integer */ | null; // Foreign Key -> College_Grades.Grade_ID

  Payment_Status?: number /* 32-bit integer */ | null; // Foreign Key -> Bible_College_Payment_Types.Bible_College_Payment_Type_ID

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  Student_Semester_ID?: number /* 32-bit integer */ | null; // Foreign Key -> College_Student_Semesters.Student_Semester_ID

  Academic_Id_Number?: number /* 32-bit integer */ | null;

  Student_Id_Number?: number /* 32-bit integer */ | null;

  Class_Id_Number?: number /* 32-bit integer */ | null;

  Audit: boolean; // Has Default

  PassFail: boolean; // Has Default

  Grade_Id_Number?: number /* 32-bit integer */ | null;
}

export type CollegeStudentSchedulesRecord = CollegeStudentSchedules;

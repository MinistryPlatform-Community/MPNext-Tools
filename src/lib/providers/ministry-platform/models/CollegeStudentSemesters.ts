/**
 * Interface for College_Student_Semesters
* Table: College_Student_Semesters
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeStudentSemesters {

  Student_Semester_ID: number /* 32-bit integer */; // Primary Key

  Student_ID: number /* 32-bit integer */; // Foreign Key -> College_Students.Student_ID

  Semester_ID: number /* 32-bit integer */; // Foreign Key -> College_Semesters.Semester_ID

  Church_Staff: boolean;
}

export type CollegeStudentSemestersRecord = CollegeStudentSemesters;

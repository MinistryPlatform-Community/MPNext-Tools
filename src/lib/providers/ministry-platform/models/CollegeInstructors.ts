/**
 * Interface for College_Instructors
* Table: College_Instructors
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeInstructors {

  Instructor_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Instructor_Id_Number?: number /* 32-bit integer */ | null;

  Instructor_Status?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Instructor_Last_name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Instructor_First_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Instructor_Middle_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Home_Phone_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Office_Phone_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Cell_Phone_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Office_Street_Address?: string /* max 70 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Office_City?: string /* max 70 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Office_State?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Office_Zip?: string /* max 50 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Home_Street_Address?: string /* max 70 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Home_City?: string /* max 70 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Home_State?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Home_Zip?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Instructor_Credentials?: string /* max 50 chars */ | null;

  Instructor_Pastor: boolean;

  /**
   * Max length: 2147483647 characters
   */
  Instructor_Memo?: string /* max 2147483647 chars */ | null;
}

export type CollegeInstructorsRecord = CollegeInstructors;

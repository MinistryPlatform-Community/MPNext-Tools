/**
 * Interface for College_Students
* Table: College_Students
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CollegeStudents {

  Student_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  College_Status_ID?: number /* 32-bit integer */ | null; // Foreign Key -> College_Statuses.College_Status_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 11 characters
   */
  Student_Number?: string /* max 11 chars */ | null;

  Application_Received?: string /* ISO datetime */ | null;

  Last_Status_Change?: string /* ISO datetime */ | null;

  Student_Id_Number?: number /* 32-bit integer */ | null;

  Student_Status_Id?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Last_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  First_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Middle_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Name_Suffix?: string /* max 50 chars */ | null;

  /**
   * Max length: 11 characters
   */
  Social_Security_Number?: string /* max 11 chars */ | null;

  Gender?: boolean | null;

  Date_of_Birth?: string /* ISO datetime */ | null;

  /**
   * Max length: 100 characters
   */
  Nick_Name?: string /* max 100 chars */ | null;

  Married?: boolean | null;

  Student_Living_on_Campus?: boolean | null;

  /**
   * Max length: 70 characters
   */
  Street_address?: string /* max 70 chars */ | null;

  /**
   * Max length: 70 characters
   */
  City?: string /* max 70 chars */ | null;

  /**
   * Max length: 50 characters
   */
  State?: string /* max 50 chars */ | null;

  /**
   * Max length: 10 characters
   */
  Zip?: string /* max 10 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Country?: string /* max 70 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Citizenship?: string /* max 70 chars */ | null;

  /**
   * Max length: 100 characters
   */
  email_address?: string /* max 100 chars */ | null;

  /**
   * Max length: 50 characters
   */
  phone_number?: string /* max 50 chars */ | null;

  Semester_of_Entry?: number /* decimal */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Student_Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Billing_Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 100 characters
   */
  Emergency_Contact?: string /* max 100 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Emergency_Contact_Address?: string /* max 70 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Emergency_Contact_City?: string /* max 70 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Emergency_Contact_State?: string /* max 50 chars */ | null;

  /**
   * Max length: 10 characters
   */
  Emergency_Contact_Zip?: string /* max 10 chars */ | null;

  /**
   * Max length: 70 characters
   */
  Emergency_Contact_Country?: string /* max 70 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Emergency_Contact_Phone?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Drivers_license_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  DL_issuing_state_province?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  DL_issuing_country?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Degree_Conferred?: string /* max 50 chars */ | null;

  Graduation_Date?: string /* ISO datetime */ | null;

  Create_date?: string /* ISO datetime */ | null;

  Update_date?: string /* ISO datetime */ | null;

  /**
   * Max length: 50 characters
   */
  Create_User?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Update_User?: string /* max 50 chars */ | null;
}

export type CollegeStudentsRecord = CollegeStudents;

/**
 * Interface for Staff
* Table: Staff
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Staff {

  Staff_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  /**
   * Max length: 254 characters
   */
  Staff_Email?: string /* email, max 254 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse?: string /* max 50 chars */ | null;

  Staff_Type_ID: number /* 32-bit integer */; // Foreign Key -> Staff_Types.Staff_Type_ID

  Staff_Status_ID: number /* 32-bit integer */; // Foreign Key -> Staff_Statuses.Staff_Status_ID

  /**
   * Max length: 100 characters
   */
  Title: string /* max 100 chars */;

  Staff_Department: number /* 32-bit integer */; // Foreign Key -> Staff_Departments.Staff_Department_ID

  Supervisor?: number /* 32-bit integer */ | null; // Foreign Key -> Staff.Staff_ID

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;

  Show_Online: boolean; // Has Default

  Show_On_Home: boolean; // Has Default

  Online_Order: number /* 32-bit integer */; // Has Default

  /**
   * Max length: 256 characters
   */
  Facebook_Url?: string /* max 256 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Twitter_Url?: string /* max 256 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Pinterest_Url?: string /* max 256 chars */ | null;
}

export type StaffRecord = Staff;

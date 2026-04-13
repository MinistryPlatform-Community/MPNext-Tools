/**
 * Interface for Discipleship
* Table: Discipleship
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Discipleship {

  Discipleship_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Date_Of_Birth: string /* ISO date (YYYY-MM-DD) */;

  Gender_ID: number /* 32-bit integer */; // Foreign Key -> Genders.Gender_ID

  Marital_Status_ID: number /* 32-bit integer */; // Foreign Key -> Marital_Statuses.Marital_Status_ID

  Meet_In_Person: boolean;

  /**
   * Max length: 128 characters
   */
  Occupation?: string /* max 128 chars */ | null;

  Status_ID: number /* 32-bit integer */; // Foreign Key -> Discipleship_Statuses.Status_ID

  Mentor?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  Mentor_Assigned?: string /* ISO datetime */ | null;

  Mentor_Confirmed?: string /* ISO datetime */ | null;
}

export type DiscipleshipRecord = Discipleship;

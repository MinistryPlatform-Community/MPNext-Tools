/**
 * Interface for SMW_SignUps
* Table: SMW_SignUps
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmwSignups {

  SMW_SignUp_ID: number /* 32-bit integer */; // Primary Key

  User_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Users.User_ID

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  Communication_Type: number /* 32-bit integer */;

  Days_On_Same_MileStone: number /* 32-bit integer */; // Has Default

  Completed: boolean; // Has Default

  Cancelled: boolean; // Has Default
}

export type SmwSignupsRecord = SmwSignups;

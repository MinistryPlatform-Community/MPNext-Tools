/**
 * Interface for Childcare_SignUps
* Table: Childcare_SignUps
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface ChildcareSignups {

  Childcare_SignUp_ID: number /* 32-bit integer */; // Primary Key

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Meeting_Day_ID: number /* 32-bit integer */; // Foreign Key -> Meeting_Days.Meeting_Day_ID

  Parent_Group_Record: number /* 32-bit integer */; // Foreign Key -> Group_Participants.Group_Participant_ID

  Child: number /* 32-bit integer */; // Foreign Key -> Participants.Participant_ID

  Childcare_Start: string /* ISO date (YYYY-MM-DD) */;

  Childcare_End: string /* ISO date (YYYY-MM-DD) */;

  Start_Date: string /* ISO datetime */; // Has Default
}

export type ChildcareSignupsRecord = ChildcareSignups;

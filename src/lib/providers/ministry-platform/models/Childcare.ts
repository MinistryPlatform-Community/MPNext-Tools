/**
 * Interface for Childcare
* Table: Childcare
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: DataExport
 * Generated from column metadata
 */
export interface Childcare {

  Childcare_ID: number /* 32-bit integer */; // Primary Key

  Parent: number /* 32-bit integer */; // Foreign Key -> Group_Participants.Group_Participant_ID

  Child: number /* 32-bit integer */; // Foreign Key -> Participants.Participant_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;
}

export type ChildcareRecord = Childcare;

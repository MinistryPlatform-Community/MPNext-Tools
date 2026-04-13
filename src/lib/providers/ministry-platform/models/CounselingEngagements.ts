/**
 * Interface for Counseling_Engagements
* Table: Counseling_Engagements
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CounselingEngagements {

  Counseling_Engagement_ID: number /* 32-bit integer */; // Primary Key

  Counselee: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Counselor: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Encourager: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Counseling_Status_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Statuses.Counseling_Status_ID

  /**
   * Max length: 2000 characters
   */
  Closing_Notes?: string /* max 2000 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  Last_Updated: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;

  Counseling_Complete: boolean; // Has Default

  Encouragement_Complete: boolean; // Has Default
}

export type CounselingEngagementsRecord = CounselingEngagements;

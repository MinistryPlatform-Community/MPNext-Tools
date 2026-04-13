/**
 * Interface for Feedback_Entries
* Table: Feedback_Entries
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface FeedbackEntries {

  Feedback_Entry_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 50 characters
   */
  Entry_Title: string /* max 50 chars */;

  Feedback_Type_ID: number /* 32-bit integer */; // Foreign Key -> Feedback_Types.Feedback_Type_ID

  Program_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Programs.Program_ID

  Date_Submitted: string /* ISO datetime */; // Has Default

  Visibility_Level_ID: number /* 32-bit integer */; // Foreign Key -> Visibility_Levels.Visibility_Level_ID

  /**
   * Max length: 2000 characters
   */
  Description?: string /* max 2000 chars */ | null;

  Ongoing_Need: boolean; // Has Default

  Assigned_To?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Care_Outcome_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Care_Outcomes.Care_Outcome_ID

  Outcome_Date?: string /* ISO datetime */ | null;

  Prayer_Counter?: number /* 32-bit integer */ | null; // Has Default

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  Web_Approved: boolean; // Has Default

  Approved: boolean; // Has Default

  Anonymous: boolean; // Has Default

  Flag_Cleared?: boolean | null;

  Flagged: number /* 32-bit integer */; // Has Default

  Last_Update_User?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Users.User_ID

  Prayer_Outcome_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Prayer_Outcomes.Prayer_Outcome_ID

  /**
   * Max length: 2000 characters
   */
  Outcome_Notes?: string /* max 2000 chars */ | null;

  Care_Case_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Care_Cases.Care_Case_ID
}

export type FeedbackEntriesRecord = FeedbackEntries;

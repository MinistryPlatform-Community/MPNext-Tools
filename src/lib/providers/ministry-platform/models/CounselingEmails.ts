/**
 * Interface for Counseling_Emails
* Table: Counseling_Emails
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface CounselingEmails {

  Counseling_Email_ID: number /* 32-bit integer */; // Primary Key

  Counseling_Engagement_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Engagements.Counseling_Engagement_ID

  /**
   * Max length: 128 characters
   */
  From_Address: string /* max 128 chars */;

  From_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 128 characters
   */
  To_Address: string /* max 128 chars */;

  To_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 50 characters
   */
  Subject: string /* max 50 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Body?: string /* max 2147483647 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default
}

export type CounselingEmailsRecord = CounselingEmails;

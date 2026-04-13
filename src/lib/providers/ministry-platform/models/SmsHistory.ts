/**
 * Interface for SMS_History
* Table: SMS_History
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface SmsHistory {

  SMS_History_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 20 characters
   */
  From_Number: string /* max 20 chars */;

  /**
   * Max length: 20 characters
   */
  To_Number: string /* max 20 chars */;

  /**
   * Max length: 200 characters
   */
  SMS_Content?: string /* max 200 chars */ | null;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  SMS_SignUp_ID?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_SignUp.SMS_SignUp_ID

  Start_Date: string /* ISO datetime */;

  isError: boolean; // Has Default
}

export type SmsHistoryRecord = SmsHistory;

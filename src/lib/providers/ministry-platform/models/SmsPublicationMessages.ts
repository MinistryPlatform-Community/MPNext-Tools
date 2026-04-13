/**
 * Interface for SMS_Publication_Messages
* Table: SMS_Publication_Messages
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmsPublicationMessages {

  SMS_Publication_Message_ID: number /* 32-bit integer */; // Primary Key

  Start_Date: string /* ISO datetime */;

  /**
   * Max length: 512 characters
   */
  Message: string /* max 512 chars */;

  SMS_Publication_ID: number /* 32-bit integer */; // Foreign Key -> SMS_Publications.SMS_Publication_ID
}

export type SmsPublicationMessagesRecord = SmsPublicationMessages;

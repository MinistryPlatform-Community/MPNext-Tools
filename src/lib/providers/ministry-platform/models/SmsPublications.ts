/**
 * Interface for SMS_Publications
* Table: SMS_Publications
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmsPublications {

  SMS_Publication_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Publication_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Twilio_Number?: string /* max 50 chars */ | null;

  SMS_Configuration_ID?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_Configurations.SMS_Configuration_ID
}

export type SmsPublicationsRecord = SmsPublications;

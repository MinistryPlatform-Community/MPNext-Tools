/**
 * Interface for SMS_Configurations
* Table: SMS_Configurations
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface SmsConfigurations {

  SMS_Configuration_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Name: string /* max 50 chars */;

  /**
   * Max length: 12 characters
   */
  Twilio_Phone: string /* max 12 chars */;

  /**
   * Max length: 128 characters
   */
  Messaging_Service_Sid?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Account_SID: string /* max 128 chars */;

  Auth_Token: Blob | string /* binary data */;
}

export type SmsConfigurationsRecord = SmsConfigurations;

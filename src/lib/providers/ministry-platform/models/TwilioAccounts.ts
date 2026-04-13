/**
 * Interface for Twilio_Accounts
* Table: Twilio_Accounts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface TwilioAccounts {

  Twilio_Account_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 25 characters
   */
  Twilio_Number: string /* max 25 chars */;

  /**
   * Max length: 128 characters
   */
  Twilio_Sid?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Twilio_Token?: string /* max 128 chars */ | null;

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;
}

export type TwilioAccountsRecord = TwilioAccounts;

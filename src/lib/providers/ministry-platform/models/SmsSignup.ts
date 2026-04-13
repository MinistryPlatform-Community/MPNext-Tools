/**
 * Interface for SMS_SignUp
* Table: SMS_SignUp
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmsSignup {

  SMS_SignUp_ID: number /* 32-bit integer */; // Primary Key

  Event_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  SMS_Publication_ID?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_Publications.SMS_Publication_ID

  /**
   * Max length: 20 characters
   */
  SMS_Keyword: string /* max 20 chars */;

  /**
   * Max length: 100 characters
   */
  SMS_Response: string /* max 100 chars */;

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Primary_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 50 characters
   */
  Special_Mode?: string /* max 50 chars */ | null;

  Enabled: boolean; // Has Default
}

export type SmsSignupRecord = SmsSignup;

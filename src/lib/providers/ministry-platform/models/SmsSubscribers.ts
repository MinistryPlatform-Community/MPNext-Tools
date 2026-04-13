/**
 * Interface for SMS_Subscribers
* Table: SMS_Subscribers
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmsSubscribers {

  SMS_Subscriber_ID: number /* 32-bit integer */; // Primary Key

  SMS_Publication_ID: number /* 32-bit integer */; // Foreign Key -> SMS_Publications.SMS_Publication_ID

  /**
   * Max length: 50 characters
   */
  SMS_Number: string /* max 50 chars */;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Subscribed: boolean;
}

export type SmsSubscribersRecord = SmsSubscribers;

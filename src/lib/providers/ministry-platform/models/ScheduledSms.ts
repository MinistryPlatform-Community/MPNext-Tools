/**
 * Interface for Scheduled_SMS
* Table: Scheduled_SMS
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface ScheduledSms {

  Scheduled_SMS_ID: number /* 32-bit integer */; // Primary Key

  Start_Date: string /* ISO datetime */; // Has Default

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Event_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  SMS_Publication_ID?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_Publications.SMS_Publication_ID

  /**
   * Max length: 50 characters
   */
  Send_Modifier?: string /* max 50 chars */ | null;

  /**
   * Max length: 160 characters
   */
  SMSBody: string /* max 160 chars */;

  From_Contact: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Status: number /* 32-bit integer */; // Foreign Key -> SMS_Communication_Statuses.SMS_Communication_Status_ID

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID
}

export type ScheduledSmsRecord = ScheduledSms;

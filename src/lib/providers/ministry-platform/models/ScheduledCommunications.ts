/**
 * Interface for Scheduled_Communications
* Table: Scheduled_Communications
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface ScheduledCommunications {

  Scheduled_Communication_ID: number /* 32-bit integer */; // Primary Key

  Start_Date: string /* ISO datetime */; // Has Default

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Event_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  Publication_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Publications.Publication_ID

  /**
   * Max length: 50 characters
   */
  Send_Modifier?: string /* max 50 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Subject: string /* max 128 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Message: string /* max 2147483647 chars */;

  From_Contact: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Status: number /* 32-bit integer */; // Foreign Key -> SMS_Communication_Statuses.SMS_Communication_Status_ID, Has Default

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID
}

export type ScheduledCommunicationsRecord = ScheduledCommunications;

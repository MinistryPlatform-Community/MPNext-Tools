/**
 * Interface for SMS_Communications
* Table: SMS_Communications
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface SmsCommunications {

  SMS_Communication_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 15 characters
   */
  From_Phone: string /* max 15 chars */;

  /**
   * Max length: 15 characters
   */
  To_Phone: string /* max 15 chars */;

  /**
   * Max length: 512 characters
   */
  SMSBody: string /* max 512 chars */;

  From_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  To_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Status: number /* 32-bit integer */; // Foreign Key -> SMS_Communication_Statuses.SMS_Communication_Status_ID

  Start_Date: string /* ISO datetime */; // Has Default

  /**
   * Max length: 1000 characters
   */
  Response?: string /* max 1000 chars */ | null;

  Send_After?: string /* ISO datetime */ | null;

  /**
   * Max length: 128 characters
   */
  Message_SID?: string /* max 128 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Image_Uri?: string /* max 256 chars */ | null;
}

export type SmsCommunicationsRecord = SmsCommunications;

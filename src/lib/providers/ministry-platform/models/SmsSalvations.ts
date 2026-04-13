/**
 * Interface for SMS_Salvations
* Table: SMS_Salvations
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface SmsSalvations {

  SMS_Salvation_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Mobile_Phone: string /* max 50 chars */;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  Complete_Date?: string /* ISO datetime */ | null;

  FollowUp_SMS_Date?: string /* ISO datetime */ | null;

  First_SMS?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_Communications.SMS_Communication_ID

  FollowUp_SMS?: number /* 32-bit integer */ | null; // Foreign Key -> SMS_Communications.SMS_Communication_ID

  Main_Group_Participant?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Participants.Group_Participant_ID

  Please_Call?: boolean | null;

  Bible?: boolean | null;

  SMW?: boolean | null;

  MyCalvary?: boolean | null;

  Second_Email_Sent?: string /* ISO datetime */ | null;
}

export type SmsSalvationsRecord = SmsSalvations;

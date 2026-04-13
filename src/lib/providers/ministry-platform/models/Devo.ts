/**
 * Interface for Devo
* Table: Devo
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Devo {

  Devo_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Title: string /* max 150 chars */;

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Devo?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 150 characters
   */
  SMS_Devo?: string /* max 150 chars */ | null;

  Sermon_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Approved: boolean; // Has Default

  /**
   * Max length: 150 characters
   */
  Spanish_Title?: string /* max 150 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Spanish_Devo?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Audio_Devo_Url?: string /* max 512 chars */ | null;
}

export type DevoRecord = Devo;

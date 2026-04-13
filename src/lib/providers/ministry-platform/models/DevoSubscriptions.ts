/**
 * Interface for Devo_Subscriptions
* Table: Devo_Subscriptions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface DevoSubscriptions {

  Devo_Subscription_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 256 characters
   */
  Email_Address: string /* max 256 chars */;

  Confirmed_Email?: boolean | null; // Has Default

  /**
   * Max length: 50 characters
   */
  First_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Last_Name?: string /* max 50 chars */ | null;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 256 characters
   */
  Status_Message?: string /* max 256 chars */ | null;

  Email_Confirmed?: string /* ISO datetime */ | null;

  Subscription_GUID: string /* GUID/UUID */; // Has Default
}

export type DevoSubscriptionsRecord = DevoSubscriptions;

/**
 * Interface for Connection_Cards
* Table: Connection_Cards
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface ConnectionCards {

  Connection_Card_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Name: string /* max 50 chars */;

  /**
   * Max length: 3000 characters
   */
  Payload?: string /* max 3000 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  Notification_User_Group?: number /* 32-bit integer */ | null; // Foreign Key -> dp_User_Groups.User_Group_ID

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Completed: boolean; // Has Default

  User_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Users.User_ID

  /**
   * Max length: 3000 characters
   */
  Notes?: string /* max 3000 chars */ | null;
}

export type ConnectionCardsRecord = ConnectionCards;

/**
 * Interface for IT_Help_Tickets
* Table: IT_Help_Tickets
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface ItHelpTickets {

  IT_Help_Ticket_ID: number /* 32-bit integer */; // Primary Key

  Submitted_For: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Request_Date: string /* ISO datetime */;

  /**
   * Max length: 50 characters
   */
  Request_Title: string /* max 50 chars */;

  /**
   * Max length: 4000 characters
   */
  Description?: string /* max 4000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Notes?: string /* max 4000 chars */ | null;

  _Completed?: boolean | null; // Read Only
}

export type ItHelpTicketsRecord = ItHelpTickets;

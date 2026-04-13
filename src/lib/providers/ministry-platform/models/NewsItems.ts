/**
 * Interface for News_Items
* Table: News_Items
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface NewsItems {

  News_Item_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Title?: string /* max 150 chars */ | null;

  /**
   * Max length: 250 characters
   */
  Summary?: string /* max 250 chars */ | null;

  Start_Date?: string /* ISO datetime */ | null;

  End_Date?: string /* ISO datetime */ | null;

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 2147483647 characters
   */
  WebHTML?: string /* max 2147483647 chars */ | null;
}

export type NewsItemsRecord = NewsItems;

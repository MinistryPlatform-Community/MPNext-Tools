/**
 * Interface for Community_Items
* Table: Community_Items
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface CommunityItems {

  Community_Item_ID: number /* 32-bit integer */; // Primary Key

  Community_Item_Type_ID: number /* 32-bit integer */; // Foreign Key -> Community_Item_Types.Community_Item_Type_ID

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 50 characters
   */
  Title?: string /* max 50 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  Start_Date?: string /* ISO datetime */ | null;

  End_Date?: string /* ISO datetime */ | null;

  Share_Phone?: boolean | null;
}

export type CommunityItemsRecord = CommunityItems;

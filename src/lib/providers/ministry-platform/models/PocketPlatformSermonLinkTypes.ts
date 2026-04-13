/**
 * Interface for Pocket_Platform_Sermon_Link_Types
* Table: Pocket_Platform_Sermon_Link_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformSermonLinkTypes {

  Sermon_Link_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Sermon_Link_Type: string /* max 50 chars */;

  Icon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Icons.Icon_ID

  Media_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pocket_Platform_Media_Types.Media_Type_ID
}

export type PocketPlatformSermonLinkTypesRecord = PocketPlatformSermonLinkTypes;

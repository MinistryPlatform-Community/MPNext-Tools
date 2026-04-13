/**
 * Interface for Pocket_Platform_Icons
* Table: Pocket_Platform_Icons
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformIcons {

  Icon_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Icon_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Icon_Code?: string /* max 50 chars */ | null;

  /**
   * Max length: 100 characters
   */
  Font_Family: string /* max 100 chars */; // Has Default
}

export type PocketPlatformIconsRecord = PocketPlatformIcons;

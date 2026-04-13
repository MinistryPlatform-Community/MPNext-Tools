/**
 * Interface for Pocket_Platform_Resource_Types
* Table: Pocket_Platform_Resource_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformResourceTypes {

  Resource_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Resource_Type: string /* max 50 chars */;
}

export type PocketPlatformResourceTypesRecord = PocketPlatformResourceTypes;

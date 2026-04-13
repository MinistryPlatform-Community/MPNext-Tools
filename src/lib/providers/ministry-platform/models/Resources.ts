/**
 * Interface for Resources
* Table: Resources
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Resources {

  Resource_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Title: string /* max 128 chars */;

  /**
   * Max length: 384 characters
   */
  Description: string /* max 384 chars */;

  /**
   * Max length: 255 characters
   */
  Resource_URL?: string /* max 255 chars */ | null;

  Author: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Approved: boolean; // Has Default
}

export type ResourcesRecord = Resources;

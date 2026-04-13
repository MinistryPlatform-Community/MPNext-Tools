/**
 * Interface for Tags
* Table: Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Tags {

  Tag_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Tag: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Tag_Group?: string /* max 50 chars */ | null;
}

export type TagsRecord = Tags;

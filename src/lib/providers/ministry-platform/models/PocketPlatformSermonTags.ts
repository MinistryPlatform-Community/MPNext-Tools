/**
 * Interface for Pocket_Platform_Sermon_Tags
* Table: Pocket_Platform_Sermon_Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformSermonTags {

  Sermon_Tag_ID: number /* 32-bit integer */; // Primary Key

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Tag_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Tags.Tag_ID
}

export type PocketPlatformSermonTagsRecord = PocketPlatformSermonTags;

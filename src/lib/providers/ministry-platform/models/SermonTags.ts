/**
 * Interface for Sermon_Tags
* Table: Sermon_Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SermonTags {

  Sermon_Tag_ID: number /* 32-bit integer */; // Primary Key

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Tag_ID: number /* 32-bit integer */; // Foreign Key -> Tags.Tag_ID

  Start_Date: string /* ISO datetime */; // Has Default
}

export type SermonTagsRecord = SermonTags;

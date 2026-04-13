/**
 * Interface for Group_Tags
* Table: Group_Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface GroupTags {

  Group_Tag_ID: number /* 32-bit integer */; // Primary Key

  Tag_ID: number /* 32-bit integer */; // Foreign Key -> Tags.Tag_ID

  Group_ID: number /* 32-bit integer */; // Foreign Key -> Groups.Group_ID
}

export type GroupTagsRecord = GroupTags;

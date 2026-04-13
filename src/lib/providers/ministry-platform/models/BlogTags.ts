/**
 * Interface for Blog_Tags
* Table: Blog_Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface BlogTags {

  Blog_Tag_ID: number /* 32-bit integer */; // Primary Key

  Blog_ID: number /* 32-bit integer */; // Foreign Key -> Blog.Blog_ID

  Tag_ID: number /* 32-bit integer */; // Foreign Key -> Tags.Tag_ID

  Start_Date: string /* ISO datetime */; // Has Default
}

export type BlogTagsRecord = BlogTags;

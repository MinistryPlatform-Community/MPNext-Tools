/**
 * Interface for Blog
* Table: Blog
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Blog {

  Blog_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Title: string /* max 150 chars */;

  /**
   * Max length: 255 characters
   */
  Summary?: string /* max 255 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Post: string /* max 2147483647 chars */;

  Start_Date: string /* ISO datetime */;

  Author: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Approved: boolean; // Has Default

  Featured: boolean; // Has Default
}

export type BlogRecord = Blog;

/**
 * Interface for Forum_Topics
* Table: Forum_Topics
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ForumTopics {

  Forum_Topic_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 250 characters
   */
  Title: string /* max 250 chars */;

  Group_ID: number /* 32-bit integer */; // Foreign Key -> Groups.Group_ID

  Created_By: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Start_Date: string /* ISO datetime */; // Has Default
}

export type ForumTopicsRecord = ForumTopics;

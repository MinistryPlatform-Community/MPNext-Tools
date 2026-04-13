/**
 * Interface for Forum_Posts
* Table: Forum_Posts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ForumPosts {

  Forum_Post_ID: number /* 32-bit integer */; // Primary Key, Foreign Key -> Forum_Posts.Forum_Post_ID

  Forum_Topic_ID: number /* 32-bit integer */; // Foreign Key -> Forum_Topics.Forum_Topic_ID

  Parent_Post_ID?: number /* 32-bit integer */ | null;

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  /**
   * Max length: 2000 characters
   */
  Post: string /* max 2000 chars */;

  Start_Date: string /* ISO datetime */; // Has Default

  Last_Update: string /* ISO datetime */; // Has Default

  Pin_Order?: number /* 32-bit integer */ | null;
}

export type ForumPostsRecord = ForumPosts;

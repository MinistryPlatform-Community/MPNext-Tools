/**
 * Interface for Shared_Stories
* Table: Shared_Stories
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SharedStories {

  Church_Story_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  First_Name: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Last_Name: string /* max 50 chars */;

  /**
   * Max length: 254 characters
   */
  Email_Address: string /* email, max 254 chars */;

  Contact_ID?: number /* 32-bit integer */ | null;

  Anonymous?: boolean | null;

  /**
   * Max length: 2147483647 characters
   */
  Story: string /* max 2147483647 chars */;

  /**
   * Max length: 255 characters
   */
  Video_Url?: string /* max 255 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default
}

export type SharedStoriesRecord = SharedStories;

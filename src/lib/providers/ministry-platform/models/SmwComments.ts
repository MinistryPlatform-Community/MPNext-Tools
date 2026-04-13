/**
 * Interface for SMW_Comments
* Table: SMW_Comments
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SmwComments {

  SMW_Comment_ID: number /* 32-bit integer */; // Primary Key

  SMW_Day_ID: number /* 32-bit integer */; // Foreign Key -> SMW_Days.SMW_Day_ID

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  /**
   * Max length: 1000 characters
   */
  Comment: string /* max 1000 chars */;

  Start_Date: string /* ISO datetime */;

  Web_Approved: boolean; // Has Default
}

export type SmwCommentsRecord = SmwComments;

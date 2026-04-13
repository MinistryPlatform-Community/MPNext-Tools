/**
 * Interface for TextBoard_Messages
* Table: TextBoard_Messages
 * Access Level: ReadWriteAssign
 * Special Permissions: None
 * Generated from column metadata
 */
export interface TextboardMessages {

  TextBoard_Message_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 2147483647 characters
   */
  TextBoard_Message: string /* max 2147483647 chars */;

  Start_Date: string /* ISO datetime */; // Has Default

  End_Date?: string /* ISO datetime */ | null;
}

export type TextboardMessagesRecord = TextboardMessages;

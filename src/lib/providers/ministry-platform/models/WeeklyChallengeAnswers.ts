/**
 * Interface for Weekly_Challenge_Answers
* Table: Weekly_Challenge_Answers
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface WeeklyChallengeAnswers {

  Weekly_Challenge_Answer_ID: number /* 32-bit integer */; // Primary Key

  Sermon_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermons.Sermon_ID

  Start_Date: string /* ISO datetime */; // Has Default

  /**
   * Max length: 4000 characters
   */
  Answer: string /* max 4000 chars */;

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Ai_Score?: number /* decimal */ | null;

  Ai_Points?: number /* 32-bit integer */ | null;
}

export type WeeklyChallengeAnswersRecord = WeeklyChallengeAnswers;

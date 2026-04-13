/**
 * Interface for Volunteer_Training_Questions
* Table: Volunteer_Training_Questions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerTrainingQuestions {

  Volunteer_Training_Question_ID: number /* 32-bit integer */; // Primary Key

  Training_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Training.Training_ID

  /**
   * Max length: 256 characters
   */
  Question: string /* max 256 chars */;

  /**
   * Max length: 2000 characters
   */
  Answers: string /* max 2000 chars */;

  /**
   * Max length: 128 characters
   */
  Correct_Answer: string /* max 128 chars */;

  Question_Order?: number /* 32-bit integer */ | null;
}

export type VolunteerTrainingQuestionsRecord = VolunteerTrainingQuestions;

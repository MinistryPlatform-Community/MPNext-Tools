/**
 * Interface for Bible_College_Applications
* Table: Bible_College_Applications
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface BibleCollegeApplications {

  Bible_College_Application_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Participant_ID: number /* 32-bit integer */; // Foreign Key -> Participants.Participant_ID

  Semester?: number /* 32-bit integer */ | null;

  /**
   * Max length: 200 characters
   */
  Occupation?: string /* max 200 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Employer?: string /* max 128 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Employer_Address?: string /* max 255 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Name?: string /* max 128 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Address?: string /* max 255 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Phone?: string /* max 50 chars */ | null;

  Relationship_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Relationships.Relationship_ID

  Health?: boolean | null;

  Last_Medical_Exam?: string /* ISO datetime */ | null;

  Physical_Handicaps?: boolean | null;

  /**
   * Max length: 1000 characters
   */
  Past_Present_Illness?: string /* max 1000 chars */ | null;

  /**
   * Max length: 1000 characters
   */
  Communicable_Disease?: string /* max 1000 chars */ | null;

  Smoker?: boolean | null;

  /**
   * Max length: 2000 characters
   */
  Alcohol?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Drugs_Explanation?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Therapy?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Hospitilized?: string /* max 2000 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Abuse_Sexual_Immorality?: string /* max 3000 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Conform_Bible?: string /* max 3000 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Habitual_Sin?: string /* max 3000 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Problem_Relationships?: string /* max 3000 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Cult_Activity?: string /* max 3000 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Salvation?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  Church_Involvement?: string /* max 3000 chars */ | null;

  /**
   * Max length: 1000 characters
   */
  Your_Church?: string /* max 1000 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Attend_Church?: string /* max 255 chars */ | null;

  /**
   * Max length: 3000 characters
   */
  How_Long?: string /* max 3000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Believe_Bible?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Believe_God?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Believe_Jesus?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Believe_Sin?: string /* max 2000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Believe_Salvation?: string /* max 2000 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Signature?: string /* max 255 chars */ | null;

  Start_Date?: string /* ISO datetime */ | null;

  Last_Updated?: string /* ISO datetime */ | null;

  _Approved?: boolean | null; // Read Only
}

export type BibleCollegeApplicationsRecord = BibleCollegeApplications;

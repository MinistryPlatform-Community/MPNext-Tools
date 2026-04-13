/**
 * Interface for Volunteer_Apps
* Table: Volunteer_Apps
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface VolunteerApps {

  Volunteer_App_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */; // Has Default

  Last_Save_Date: string /* ISO datetime */;

  Volunteer_App_Status_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_App_Statuses.Volunteer_App_Status_ID

  Status_Reason_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Volunteer_App_Status_Reasons.Status_Reason_ID

  /**
   * Max length: 2147483647 characters
   */
  Notes?: string /* max 2147483647 chars */ | null;

  Follow_Up_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  Submitted_Date?: string /* ISO datetime */ | null;

  Clearing_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  Volunteer_Campus: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  /**
   * Max length: 128 characters
   */
  Occupation?: string /* max 128 chars */ | null;

  Employee?: boolean | null;

  /**
   * Max length: 1024 characters
   */
  Kids?: string /* max 1024 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Other_Church?: string /* max 128 chars */ | null;

  Statement_Of_Faith?: boolean | null;

  /**
   * Max length: 2048 characters
   */
  Disagree_SOF?: string /* max 2048 chars */ | null;

  Biblical_Lifestyles?: boolean | null;

  /**
   * Max length: 2048 characters
   */
  Disagree_BLifestyles?: string /* max 2048 chars */ | null;

  Salvation_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  Water_Baptized?: boolean | null;

  Water_Baptized_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  /**
   * Max length: 1024 characters
   */
  Water_Baptized_Location?: string /* max 1024 chars */ | null;

  Start_Attending_CCM?: string /* ISO date (YYYY-MM-DD) */ | null;

  /**
   * Max length: 50 characters
   */
  Attend_How_Often?: string /* max 50 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Testimony?: string /* max 4000 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Gospel?: string /* max 2000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Devotion_Life?: string /* max 4000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Talents_Skills_Hobbies?: string /* max 4000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Classes_Workshops?: string /* max 4000 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Other_Information?: string /* max 4000 chars */ | null;

  /**
   * Max length: 100 characters
   */
  Maiden_Name?: string /* max 100 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Social_Security_Number?: string /* max 50 chars */ | null;

  Convicted_Crime?: boolean | null;

  /**
   * Max length: 4000 characters
   */
  Conviction_Description?: string /* max 4000 chars */ | null;

  Have_Disease?: boolean | null;

  /**
   * Max length: 2048 characters
   */
  Disease_Details?: string /* max 2048 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Digital_Signature?: string /* max 128 chars */ | null;

  Psychological_Issues?: boolean | null;

  /**
   * Max length: 2048 characters
   */
  Psychological_Details?: string /* max 2048 chars */ | null;

  Abuse_Victim?: boolean | null;

  /**
   * Max length: 2048 characters
   */
  Abuse_Details?: string /* max 2048 chars */ | null;

  /**
   * Max length: 4000 characters
   */
  Director_Notes?: string /* max 4000 chars */ | null;

  Last_Contact_Date?: string /* ISO datetime */ | null;

  OLD_MQID?: number /* 32-bit integer */ | null;
}

export type VolunteerAppsRecord = VolunteerApps;

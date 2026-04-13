/**
 * Interface for Volunter_App_CCA
* Table: Volunter_App_CCA
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface VolunterAppCca {

  Volunteer_App_CCA_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_Employment_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_App_Employment_Apps.Volunteer_App_Employment_App_ID

  Faith?: boolean | null;

  Servant?: boolean | null;

  Motivated?: boolean | null;

  /**
   * Max length: 128 characters
   */
  Previous_Interview?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Relative_Employees?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Publications?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Age_Grade_Pref?: string /* max 128 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Student_Teaching?: string /* max 512 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Credentials_Certs?: string /* max 512 chars */ | null;

  /**
   * Max length: 750 characters
   */
  Teaching_Experience?: string /* max 750 chars */ | null;

  /**
   * Max length: 750 characters
   */
  Recent_Teaching_Exp?: string /* max 750 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Course_Hours_Completed?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Course_Hours_Completed_2?: string /* max 128 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Course_Hours_Completed_3?: string /* max 128 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Transcript?: string /* max 2147483647 chars */ | null;
}

export type VolunterAppCcaRecord = VolunterAppCca;

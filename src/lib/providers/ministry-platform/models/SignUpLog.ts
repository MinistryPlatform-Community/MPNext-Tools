/**
 * Interface for Sign_Up_Log
* Table: Sign_Up_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SignUpLog {

  Sign_Up_Attempt_ID: number /* 32-bit integer */; // Primary Key

  Sign_Up_Attempt_Guid: string /* GUID/UUID */; // Has Default

  /**
   * Max length: 75 characters
   */
  Server_Name: string /* max 75 chars */;

  /**
   * Max length: 50 characters
   */
  IP_Address: string /* max 50 chars */;

  /**
   * Max length: 100 characters
   */
  First_Name: string /* max 100 chars */;

  /**
   * Max length: 100 characters
   */
  Last_Name: string /* max 100 chars */;

  /**
   * Max length: 100 characters
   */
  Email: string /* max 100 chars */;

  /**
   * Max length: 50 characters
   */
  Mobile_Phone?: string /* max 50 chars */ | null;

  Birth_Date: string /* ISO datetime */;

  Gender_ID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 250 characters
   */
  Return_Url?: string /* max 250 chars */ | null;

  Create_Contact: boolean;

  Create_Household: boolean;

  Create_Participant: boolean;

  Create_User: boolean;

  Contact_ID?: number /* 32-bit integer */ | null;

  Time_Stamp: string /* ISO datetime */;

  Has_Signed_Up: boolean;

  User_Found: boolean;
}

export type SignUpLogRecord = SignUpLog;

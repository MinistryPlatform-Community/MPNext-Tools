/**
 * Interface for Forgot_Password_Log
* Table: Forgot_Password_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ForgotPasswordLog {

  Forgot_Password_Log_ID: number /* 32-bit integer */; // Primary Key

  Forgot_Password_Log_Guid: string /* GUID/UUID */;

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
  Email: string /* max 100 chars */;

  /**
   * Max length: 100 characters
   */
  First_Name: string /* max 100 chars */;

  Time_Stamp: string /* ISO datetime */;

  Found_Contact: boolean;

  Password_Recovered: boolean;

  User_ID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 250 characters
   */
  Return_Url?: string /* max 250 chars */ | null;
}

export type ForgotPasswordLogRecord = ForgotPasswordLog;

/**
 * Interface for Authentication_Log
* Table: Authentication_Log
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface AuthenticationLog {

  Authentication_Log_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 254 characters
   */
  User_Name: string /* max 254 chars */;

  /**
   * Max length: 75 characters
   */
  Server_Name: string /* max 75 chars */;

  /**
   * Max length: 50 characters
   */
  IP_Address: string /* max 50 chars */;

  Date_Time: string /* ISO datetime */;

  User_ID?: number /* 32-bit integer */ | null;

  Success: boolean;
}

export type AuthenticationLogRecord = AuthenticationLog;

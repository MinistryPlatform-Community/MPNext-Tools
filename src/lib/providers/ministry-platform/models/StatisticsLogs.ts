/**
 * Interface for Statistics_Logs
* Table: Statistics_Logs
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StatisticsLogs {

  Log_ID: number /* 32-bit integer */; // Primary Key

  Log_Date: string /* ISO datetime */;

  /**
   * Max length: 75 characters
   */
  Table_Name: string /* max 75 chars */;

  Duration?: number /* 32-bit integer */ | null;

  Sample_Percent?: unknown | null;
}

export type StatisticsLogsRecord = StatisticsLogs;

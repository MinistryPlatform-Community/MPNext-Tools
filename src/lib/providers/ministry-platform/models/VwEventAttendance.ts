/**
 * Interface for vw_Event_Attendance
* Table: vw_Event_Attendance
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VwEventAttendance {

  Event_ID: number /* 32-bit integer */;

  /**
   * Max length: 75 characters
   */
  Event_Title: string /* max 75 chars */;

  Event_Start_Date: string /* ISO datetime */;

  Kid_Count?: number /* 32-bit integer */ | null;

  /**
   * Max length: 30 characters
   */
  Day_of_Week?: string /* max 30 chars */ | null;
}

export type VwEventAttendanceRecord = VwEventAttendance;

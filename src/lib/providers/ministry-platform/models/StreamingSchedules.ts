/**
 * Interface for Streaming_Schedules
* Table: Streaming_Schedules
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StreamingSchedules {

  Streaming_Schedule_ID: number /* 32-bit integer */; // Primary Key

  Day_Of_Week: number /* 32-bit integer */; // Foreign Key -> Meeting_Days.Meeting_Day_ID

  Start_Time: string /* ISO time (HH:MM:SS) */;

  End_Time: string /* ISO time (HH:MM:SS) */;

  Enabled: boolean; // Has Default

  /**
   * Max length: 255 characters
   */
  Streaming_URL?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Dash_Streaming_URL?: string /* max 255 chars */ | null;

  /**
   * Max length: 64 characters
   */
  RESI_Embed_ID?: string /* max 64 chars */ | null;

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Streaming_Config_ID: number /* 32-bit integer */; // Foreign Key -> Streaming_Configs.Streaming_Config_ID
}

export type StreamingSchedulesRecord = StreamingSchedules;

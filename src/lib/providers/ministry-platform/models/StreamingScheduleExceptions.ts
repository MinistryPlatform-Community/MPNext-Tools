/**
 * Interface for Streaming_Schedule_Exceptions
* Table: Streaming_Schedule_Exceptions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StreamingScheduleExceptions {

  Streaming_Schedule_Exception_ID: number /* 32-bit integer */; // Primary Key

  Start_Date: string /* ISO datetime */;

  End_Date: string /* ISO datetime */;

  Show_Streaming: boolean; // Has Default

  Streaming_Config_ID: number /* 32-bit integer */; // Foreign Key -> Streaming_Configs.Streaming_Config_ID
}

export type StreamingScheduleExceptionsRecord = StreamingScheduleExceptions;

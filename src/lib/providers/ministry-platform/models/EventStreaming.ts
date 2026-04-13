/**
 * Interface for Event_Streaming
* Table: Event_Streaming
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface EventStreaming {

  Event_Streaming_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Title: string /* max 50 chars */;

  Start_Date: string /* ISO datetime */;

  End_Date: string /* ISO datetime */;
}

export type EventStreamingRecord = EventStreaming;

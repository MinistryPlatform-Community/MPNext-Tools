/**
 * Interface for Wait_Stats_Baseline
* Table: Wait_Stats_Baseline
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface WaitStatsBaseline {

  /**
   * Max length: 60 characters
   */
  WaitType: string /* max 60 chars */; // Primary Key

  WaitingTasksCount: number /* 64-bit integer */;

  WaitTimeMS: number /* 64-bit integer */;

  MaxWaitTimeMS: number /* 64-bit integer */;

  SignalWaitTimeMS: number /* 64-bit integer */;

  SnapshotDT: string /* ISO datetime */;
}

export type WaitStatsBaselineRecord = WaitStatsBaseline;

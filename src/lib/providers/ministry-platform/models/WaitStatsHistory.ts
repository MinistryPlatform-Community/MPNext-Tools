/**
 * Interface for Wait_Stats_History
* Table: Wait_Stats_History
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface WaitStatsHistory {

  WaitStatsID: number /* 32-bit integer */; // Primary Key

  SnapshotDT: string /* ISO datetime */; // Has Default

  /**
   * Max length: 60 characters
   */
  WaitType: string /* max 60 chars */;

  WaitingTasksCount: number /* 64-bit integer */;

  WaitTimeMS: number /* 64-bit integer */;

  MaxWaitTimeMS: number /* 64-bit integer */;

  SignalWaitTimeMS: number /* 64-bit integer */;

  ResourceWaitTimeMS?: number /* 64-bit integer */ | null; // Read Only, Computed

  SnapshotHour?: number /* 32-bit integer */ | null; // Read Only, Computed

  SnapshotDay?: string /* ISO date (YYYY-MM-DD) */ | null; // Read Only, Computed

  SnapshotISOYear?: number /* 16-bit integer */ | null; // Read Only, Computed

  SnapshotWeek?: number /* 32-bit integer */ | null; // Read Only, Computed

  SnapshotMonth?: number /* 32-bit integer */ | null; // Read Only, Computed

  SnapshotYear?: number /* 32-bit integer */ | null; // Read Only, Computed
}

export type WaitStatsHistoryRecord = WaitStatsHistory;

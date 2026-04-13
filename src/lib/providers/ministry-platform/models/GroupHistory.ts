/**
 * Interface for Group_History
* Table: Group_History
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface GroupHistory {

  Group_History_ID: number /* 32-bit integer */; // Primary Key

  Group_ID: number /* 32-bit integer */; // Foreign Key -> Groups.Group_ID

  Start_Date: string /* ISO datetime */;

  Group_History_Type_ID: number /* 32-bit integer */; // Foreign Key -> Group_History_Types.Group_History_Type_ID

  Event_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  Communication_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Communications.Communication_ID

  /**
   * Max length: 512 characters
   */
  Notes?: string /* max 512 chars */ | null;
}

export type GroupHistoryRecord = GroupHistory;

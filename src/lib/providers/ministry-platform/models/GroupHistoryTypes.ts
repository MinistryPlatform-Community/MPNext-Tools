/**
 * Interface for Group_History_Types
* Table: Group_History_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface GroupHistoryTypes {

  Group_History_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Group_History_Type: string /* max 50 chars */;
}

export type GroupHistoryTypesRecord = GroupHistoryTypes;

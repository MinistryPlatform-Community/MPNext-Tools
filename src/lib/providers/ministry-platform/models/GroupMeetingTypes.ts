/**
 * Interface for Group_Meeting_Types
* Table: Group_Meeting_Types
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface GroupMeetingTypes {

  Group_Meeting_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Group_Meeting_Type: string /* max 50 chars */;
}

export type GroupMeetingTypesRecord = GroupMeetingTypes;

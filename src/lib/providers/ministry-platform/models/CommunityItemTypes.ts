/**
 * Interface for Community_Item_Types
* Table: Community_Item_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface CommunityItemTypes {

  Community_Item_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Community_Item_Type: string /* max 50 chars */;

  Days_Active: number /* 32-bit integer */; // Has Default
}

export type CommunityItemTypesRecord = CommunityItemTypes;

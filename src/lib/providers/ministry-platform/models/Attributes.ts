/**
 * Interface for Attributes
* Table: Attributes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Attributes {

  Attribute_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Attribute_Name: string /* max 50 chars */;

  /**
   * Max length: 255 characters
   */
  Description?: string /* max 255 chars */ | null;

  Attribute_Type_ID: number /* 32-bit integer */; // Foreign Key -> Attribute_Types.Attribute_Type_ID

  /**
   * Max length: 2147483647 characters
   */
  HTMLDescription?: string /* max 2147483647 chars */ | null;

  Sermon_ID?: number /* 32-bit integer */ | null;

  Create_Attribute_Group: boolean; // Has Default

  /**
   * Max length: 50 characters
   */
  Icon?: string /* max 50 chars */ | null;
}

export type AttributesRecord = Attributes;

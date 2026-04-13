/**
 * Interface for Web_Objects
* Table: Web_Objects
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface WebObjects {

  Web_Object_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  ObjectType: string /* max 50 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Payload?: string /* max 2147483647 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  User_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Users.User_ID

  Deleted: boolean; // Has Default

  Last_Updated: string /* ISO datetime */; // Has Default
}

export type WebObjectsRecord = WebObjects;

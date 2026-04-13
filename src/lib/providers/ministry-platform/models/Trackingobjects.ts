/**
 * Interface for TrackingObjects
* Table: TrackingObjects
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Trackingobjects {

  TrackingObject_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Object_Type: string /* max 50 chars */;

  Record_ID: number /* 32-bit integer */;

  User_ID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Tracking_GUID?: string /* max 50 chars */ | null;

  Start_Date: string /* ISO datetime */;

  Last_Updated: string /* ISO datetime */;
}

export type TrackingobjectsRecord = Trackingobjects;

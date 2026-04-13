/**
 * Interface for hReports
* Table: hReports
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Hreports {

  hReport_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 100 characters
   */
  Title: string /* max 100 chars */;

  /**
   * Max length: 255 characters
   */
  Description?: string /* max 255 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Field_Mapping?: string /* max 512 chars */ | null;

  /**
   * Max length: 192 characters
   */
  Stored_Procedure?: string /* max 192 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  ReportHTML?: string /* max 2147483647 chars */ | null;

  Report_Active?: boolean | null;

  Start_Date: string /* ISO datetime */; // Has Default

  Report_GUID: string /* GUID/UUID */; // Has Default
}

export type HreportsRecord = Hreports;

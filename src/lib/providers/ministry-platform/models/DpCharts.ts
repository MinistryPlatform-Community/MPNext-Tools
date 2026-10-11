/**
 * Interface for dp_Charts
* Table: dp_Charts
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface DpCharts {

  Chart_ID: number /* 32-bit integer */; // Primary Key

  Page_ID: number /* 32-bit integer */; // Foreign Key -> dp_Pages.Page_ID

  /**
   * Max length: 50 characters
   */
  Chart_Name: string /* max 50 chars */;

  /**
   * Max length: 2000 characters
   */
  Label_Field: string /* max 2000 chars */;

  /**
   * Max length: 2000 characters
   */
  Data_Field: string /* max 2000 chars */;

  /**
   * Max length: 256 characters
   */
  Sort_Field?: string /* max 256 chars */ | null;

  Aggregation_Type_ID: number /* 32-bit integer */; // Foreign Key -> dp_Aggregation_Types.Aggregation_Type_ID

  Default_Chart_Type_ID: number /* 32-bit integer */; // Foreign Key -> dp_Chart_Types.Chart_Type_ID

  Position: number /* 32-bit integer */; // Has Default

  Active: boolean; // Has Default

  Cache_Minutes: number /* 16-bit integer */; // Has Default
}

export type DpChartsRecord = DpCharts;

/**
 * Interface for Pocket_Platform_Sermon_Series_Roku_Categories
* Table: Pocket_Platform_Sermon_Series_Roku_Categories
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformSermonSeriesRokuCategories {

  Sermon_Series_Roku_Category_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 75 characters
   */
  Sermon_Series_Roku_Category_Name: string /* max 75 chars */;

  /**
   * Max length: 4000 characters
   */
  Sermon_Series_Roku_Category_Description?: string /* max 4000 chars */ | null;
}

export type PocketPlatformSermonSeriesRokuCategoriesRecord = PocketPlatformSermonSeriesRokuCategories;

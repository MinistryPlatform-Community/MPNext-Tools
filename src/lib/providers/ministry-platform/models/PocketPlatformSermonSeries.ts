/**
 * Interface for Pocket_Platform_Sermon_Series
* Table: Pocket_Platform_Sermon_Series
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface PocketPlatformSermonSeries {

  Sermon_Series_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 100 characters
   */
  Title: string /* max 100 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 100 characters
   */
  Display_Title?: string /* max 100 chars */ | null;

  /**
   * Max length: 100 characters
   */
  Subtitle?: string /* max 100 chars */ | null;

  Status_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Statuses.Status_ID

  Position?: number /* 32-bit integer */ | null;

  Congregation_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Congregations.Congregation_ID

  Series_Start_Date?: string /* ISO datetime */ | null;

  Old_Series?: number /* 32-bit integer */ | null; // Foreign Key -> Media_Archive_Series.Media_Archive_Series_ID

  Sermon_Series_Type_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermon_Series_Types.Sermon_Series_Type_ID, Has Default

  Bible_Book_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Bible_Books.Bible_Book_ID

  Show_On_Roku?: boolean | null;

  Series_UUID?: string /* GUID/UUID */ | null; // Has Default

  Last_Message_Date?: string /* ISO datetime */ | null;

  Sermon_Series_Roku_Category_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pocket_Platform_Sermon_Series_Roku_Categories.Sermon_Series_Roku_Category_ID

  Podcast: number /* 32-bit integer */; // Foreign Key -> PodCasts.PodCast_ID, Has Default

  Book_ID?: number /* 32-bit integer */ | null;

  Latest_Sermon_Date?: string /* ISO datetime */ | null;
}

export type PocketPlatformSermonSeriesRecord = PocketPlatformSermonSeries;

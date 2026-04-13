/**
 * Interface for Pocket_Platform_Sermons
* Table: Pocket_Platform_Sermons
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface PocketPlatformSermons {

  Sermon_ID: number /* 32-bit integer */; // Primary Key

  Series_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Sermon_Series.Sermon_Series_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Service_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pocket_Platform_Service_Types.Service_Type_ID

  /**
   * Max length: 100 characters
   */
  Title: string /* max 100 chars */;

  /**
   * Max length: 100 characters
   */
  Subtitle?: string /* max 100 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  Sermon_Date: string /* ISO datetime */;

  Speaker_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Speakers.Speaker_ID

  /**
   * Max length: 255 characters
   */
  Scripture_Links?: string /* max 255 chars */ | null;

  Position?: number /* 32-bit integer */ | null;

  Use_For_Podcast: boolean; // Has Default

  Status_ID: number /* 32-bit integer */; // Foreign Key -> Pocket_Platform_Statuses.Status_ID

  Notes_Form_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Forms.Form_ID

  /**
   * Max length: 50 characters
   */
  Sermon_Number?: string /* max 50 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Sermon_Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 200 characters
   */
  Spanish_Title?: string /* max 200 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Spanish_Notes?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 200 characters
   */
  Portuguese_Title?: string /* max 200 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Portuguese_Notes?: string /* max 2147483647 chars */ | null;

  Old_Media_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Media_Archive_Items.Media_Archive_Item_ID

  Locked?: boolean | null;

  Roku_Episode_Number?: number /* 32-bit integer */ | null;

  Sermon_UUID?: string /* GUID/UUID */ | null; // Has Default

  Processing_Complete: boolean; // Has Default

  Book_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pocket_Platform_Bible_Books.Book_ID

  /**
   * Max length: 2147483647 characters
   */
  Transcription_Text?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Transcription_TimeCode?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 75 characters
   */
  TranscriptionID?: string /* max 75 chars */ | null;

  Awaiting_Transcription: boolean; // Has Default

  /**
   * Max length: 512 characters
   */
  Ai_Summary?: string /* max 512 chars */ | null;

  /**
   * Max length: 512 characters
   */
  Ai_Tags?: string /* max 512 chars */ | null;

  Ai_Word_Count?: number /* 32-bit integer */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Ai_Topics?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Ai_Challenge?: string /* max 2000 chars */ | null;
}

export type PocketPlatformSermonsRecord = PocketPlatformSermons;

/**
 * Interface for PodCasts
* Table: PodCasts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport
 * Generated from column metadata
 */
export interface Podcasts {

  PodCast_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Title: string /* max 128 chars */;

  /**
   * Max length: 384 characters
   */
  Description: string /* max 384 chars */;

  /**
   * Max length: 128 characters
   */
  Podcast_URL: string /* max 128 chars */;

  Items_To_Include: number /* 32-bit integer */;

  /**
   * Max length: 50 characters
   */
  Author_Name: string /* max 50 chars */;

  /**
   * Max length: 254 characters
   */
  Author_Email: string /* email, max 254 chars */;

  Podcast_GUID: string /* GUID/UUID */; // Has Default

  Update_Image: boolean; // Has Default
}

export type PodcastsRecord = Podcasts;

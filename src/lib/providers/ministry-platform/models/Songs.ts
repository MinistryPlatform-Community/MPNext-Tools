/**
 * Interface for Songs
* Table: Songs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Songs {

  Song_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Song_Title: string /* max 128 chars */;

  /**
   * Max length: 128 characters
   */
  Artist: string /* max 128 chars */;

  /**
   * Max length: 128 characters
   */
  Album?: string /* max 128 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Lyrics?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 256 characters
   */
  ITunes?: string /* max 256 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Spotify?: string /* max 256 chars */ | null;
}

export type SongsRecord = Songs;

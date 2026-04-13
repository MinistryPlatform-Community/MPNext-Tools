/**
 * Interface for Streaming_Configs
* Table: Streaming_Configs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StreamingConfigs {

  Streaming_Config_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Name: string /* max 50 chars */;

  /**
   * Max length: 512 characters
   */
  Description?: string /* max 512 chars */ | null;

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  /**
   * Max length: 255 characters
   */
  HLS_Url: string /* max 255 chars */;

  /**
   * Max length: 255 characters
   */
  DASH_Url?: string /* max 255 chars */ | null;

  /**
   * Max length: 50 characters
   */
  RESI_Embed_ID: string /* max 50 chars */;
}

export type StreamingConfigsRecord = StreamingConfigs;

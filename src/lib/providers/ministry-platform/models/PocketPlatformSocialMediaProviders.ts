/**
 * Interface for Pocket_Platform_Social_Media_Providers
* Table: Pocket_Platform_Social_Media_Providers
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface PocketPlatformSocialMediaProviders {

  Social_Media_Provider_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 100 characters
   */
  Social_Media_Provider: string /* max 100 chars */;
}

export type PocketPlatformSocialMediaProvidersRecord = PocketPlatformSocialMediaProviders;

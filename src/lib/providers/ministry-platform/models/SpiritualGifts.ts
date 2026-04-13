/**
 * Interface for Spiritual_Gifts
* Table: Spiritual_Gifts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SpiritualGifts {

  Spiritual_Gift_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Spiritual_Gift: string /* max 128 chars */;

  /**
   * Max length: 512 characters
   */
  Definition?: string /* max 512 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Strengths?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Weaknesses?: string /* max 2147483647 chars */ | null;

  Attribute_ID: number /* 32-bit integer */; // Foreign Key -> Attributes.Attribute_ID
}

export type SpiritualGiftsRecord = SpiritualGifts;

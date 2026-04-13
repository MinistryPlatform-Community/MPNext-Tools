/**
 * Interface for Classified_Categories
* Table: Classified_Categories
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ClassifiedCategories {

  Classified_Category_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Name: string /* max 50 chars */;

  /**
   * Max length: 7 characters
   */
  Hex_Color?: string /* max 7 chars */ | null;
}

export type ClassifiedCategoriesRecord = ClassifiedCategories;

/**
 * Interface for Shirt_Sizes
* Table: Shirt_Sizes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ShirtSizes {

  Shirt_Size_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Shirt_Size: string /* max 50 chars */;

  Online_Sort_Order?: number /* 32-bit integer */ | null;
}

export type ShirtSizesRecord = ShirtSizes;

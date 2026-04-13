/**
 * Interface for Classifieds
* Table: Classifieds
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Classifieds {

  Classified_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 2147483647 characters
   */
  Classified_Ad: string /* max 2147483647 chars */;

  Show_Home_Phone: boolean; // Has Default

  Show_Email: boolean; // Has Default

  Classified_Category_ID: number /* 32-bit integer */; // Foreign Key -> Classified_Categories.Classified_Category_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Approved: boolean; // Has Default

  Congregation_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Congregations.Congregation_ID

  Show_Mobile_Phone: boolean; // Has Default

  Household_ID: number /* 32-bit integer */; // Foreign Key -> Households.Household_ID
}

export type ClassifiedsRecord = Classifieds;

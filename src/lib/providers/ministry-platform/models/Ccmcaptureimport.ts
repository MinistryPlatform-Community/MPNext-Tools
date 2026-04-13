/**
 * Interface for CCMCaptureImport
* Table: CCMCaptureImport
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Ccmcaptureimport {

  Import_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 255 characters
   */
  MomName?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  MomEmail?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Address?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  City?: string /* max 255 chars */ | null;

  Zip?: number /* decimal */ | null;

  Contact_ID?: number /* 32-bit integer */ | null;

  Household_ID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 255 characters
   */
  Daughter1?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Daughter1Group?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Daughter2?: string /* max 255 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Daughter2Group?: string /* max 255 chars */ | null;
}

export type CcmcaptureimportRecord = Ccmcaptureimport;

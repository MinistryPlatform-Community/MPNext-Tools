/**
 * Interface for _Import_MICR
* Table: _Import_MICR
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface ImportMicr {

  /**
   * Max length: 50 characters
   */
  DFIID?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  DFIAcct?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  NameCounter?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  MICRCounter?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  NAMICRLookupCounter?: string /* max 50 chars */ | null;
}

export type ImportMicrRecord = ImportMicr;

/**
 * Interface for Frequencies
* Table: Frequencies
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Frequencies {

  Frequency_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Frequency: string /* max 50 chars */;
}

export type FrequenciesRecord = Frequencies;

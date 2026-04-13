/**
 * Interface for Journal_Ref_Prefixes
* Table: Journal_Ref_Prefixes
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface JournalRefPrefixes {

  Journal_Ref_Prefix_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Journal_Ref_Prefix_Name: string /* max 50 chars */;

  /**
   * Max length: 16 characters
   */
  Journal_Ref_Prefix_Code: string /* max 16 chars */;
}

export type JournalRefPrefixesRecord = JournalRefPrefixes;

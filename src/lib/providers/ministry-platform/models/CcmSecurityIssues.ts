/**
 * Interface for CCM_Security_Issues
* Table: CCM_Security_Issues
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface CcmSecurityIssues {

  CCM_Security_Issue_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Security_Issue_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Security_Issue_Types.Security_Issue_Type_ID

  Start_Date: string /* ISO datetime */;

  /**
   * Max length: 2147483647 characters
   */
  Situation?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Recommendations?: string /* max 2147483647 chars */ | null;

  Resolution_Date?: string /* ISO datetime */ | null;
}

export type CcmSecurityIssuesRecord = CcmSecurityIssues;

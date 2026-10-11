/**
 * Interface for dp_Audit_Retention_Runs
* Table: dp_Audit_Retention_Runs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: DataExport
 * Generated from column metadata
 */
export interface DpAuditRetentionRuns {

  Audit_Retention_Run_ID: number /* 32-bit integer */; // Primary Key

  Run_Date: string /* ISO datetime */;

  Active_Erase_Policies: number /* 32-bit integer */;

  Active_Retain_Policies: number /* 32-bit integer */;

  Max_Minutes: number /* 32-bit integer */;

  Policies_Run: number /* 32-bit integer */;

  Duration_Minutes: number /* 32-bit integer */;

  Deleted_Audits: number /* 32-bit integer */;

  Deleted_Details: number /* 32-bit integer */;

  Remaining_Audits: number /* 32-bit integer */;

  Remaining_Details: number /* 32-bit integer */;
}

export type DpAuditRetentionRunsRecord = DpAuditRetentionRuns;

/**
 * Interface for _Deployment_Logs
* Table: _Deployment_Logs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface DeploymentLogs {

  Log_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 128 characters
   */
  Log_Title: string /* max 128 chars */;

  Log_Date: string /* ISO datetime */;

  /**
   * Max length: 2147483647 characters
   */
  Log_Content?: string /* max 2147483647 chars */ | null;

  Log_Code?: number /* 32-bit integer */ | null;

  Deployment_ID?: number /* 32-bit integer */ | null; // Foreign Key -> _Deployments.Deployment_ID
}

export type DeploymentLogsRecord = DeploymentLogs;

/**
 * Interface for Staff_Departments
* Table: Staff_Departments
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface StaffDepartments {

  Staff_Department_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Department: string /* max 50 chars */;
}

export type StaffDepartmentsRecord = StaffDepartments;

/**
 * Interface for Employment_Applicants
* Table: Employment_Applicants
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface EmploymentApplicants {

  Employment_Applicant_ID: number /* 32-bit integer */; // Primary Key

  Volunteer_App_ID: number /* 32-bit integer */; // Foreign Key -> Volunteer_Apps.Volunteer_App_ID

  Employment_ID: number /* 32-bit integer */; // Foreign Key -> Employment.Employment_ID

  Start_Date: string /* ISO datetime */; // Has Default

  /**
   * Max length: 3000 characters
   */
  HR_Notes?: string /* max 3000 chars */ | null;
}

export type EmploymentApplicantsRecord = EmploymentApplicants;

/**
 * Interface for vw_analysis_volunteer_programs
* Table: vw_analysis_volunteer_programs
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VwAnalysisVolunteerPrograms {

  Program_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 130 characters
   */
  Program_Name?: string /* max 130 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Congregation_Name?: string /* max 50 chars */ | null;

  Age_NULL?: number /* 32-bit integer */ | null;

  Age_0_10?: number /* 32-bit integer */ | null;

  Age_10_19?: number /* 32-bit integer */ | null;

  Age_20_29?: number /* 32-bit integer */ | null;

  Age_30_39?: number /* 32-bit integer */ | null;

  Age_40_49?: number /* 32-bit integer */ | null;

  Age_50_59?: number /* 32-bit integer */ | null;

  Age_60_69?: number /* 32-bit integer */ | null;

  Age_70_79?: number /* 32-bit integer */ | null;

  Age_80_Up?: number /* 32-bit integer */ | null;
}

export type VwAnalysisVolunteerProgramsRecord = VwAnalysisVolunteerPrograms;

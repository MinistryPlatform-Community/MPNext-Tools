/**
 * Interface for Volunteer_App_Reference_Types
* Table: Volunteer_App_Reference_Types
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VolunteerAppReferenceTypes {

  Volunteer_App_Reference_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Reference_Type: string /* max 50 chars */;
}

export type VolunteerAppReferenceTypesRecord = VolunteerAppReferenceTypes;

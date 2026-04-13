/**
 * Interface for Appointment_Types
* Table: Appointment_Types
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface AppointmentTypes {

  Appointment_Type_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Appointment_Type: string /* max 50 chars */;
}

export type AppointmentTypesRecord = AppointmentTypes;

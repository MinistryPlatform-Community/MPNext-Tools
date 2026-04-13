/**
 * Interface for Recurring_Frequencies
* Table: Recurring_Frequencies
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface RecurringFrequencies {

  Recurring_Frequency_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Recurring_Frequency: string /* max 50 chars */;

  Add_Days: number /* 32-bit integer */; // Has Default

  Add_Month: number /* 32-bit integer */; // Has Default

  Add_Year: number /* 32-bit integer */; // Has Default

  Online_Sort_Order?: number /* 32-bit integer */ | null;
}

export type RecurringFrequenciesRecord = RecurringFrequencies;

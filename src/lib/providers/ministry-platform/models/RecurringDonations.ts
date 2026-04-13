/**
 * Interface for Recurring_Donations
* Table: Recurring_Donations
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface RecurringDonations {

  Recurring_Donation_ID: number /* 32-bit integer */; // Primary Key

  Donor_ID: number /* 32-bit integer */; // Foreign Key -> Donors.Donor_ID

  Program_ID: number /* 32-bit integer */; // Foreign Key -> Programs.Program_ID

  Start_Date: string /* ISO datetime */;

  End_Date: string /* ISO datetime */;

  Setup_Date: string /* ISO datetime */;

  /**
   * Max length: 250 characters
   */
  Notes?: string /* max 250 chars */ | null;

  Recurring_Frequency_ID: number /* 32-bit integer */; // Foreign Key -> Recurring_Frequencies.Recurring_Frequency_ID

  Last_Processed?: string /* ISO datetime */ | null;

  Next_Process_Date: string /* ISO datetime */;

  Donor_Payment_Profile_ID: number /* 32-bit integer */; // Foreign Key -> Donor_Payment_Profiles.Donor_Payment_Profile_ID

  Amount: number /* currency amount */;
}

export type RecurringDonationsRecord = RecurringDonations;

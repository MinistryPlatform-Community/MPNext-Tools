/**
 * Interface for vw_mp_giving_unit_summary_donations
* Table: vw_mp_giving_unit_summary_donations
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VwMpGivingUnitSummaryDonations {

  Donation_ID: number /* 32-bit integer */; // Foreign Key -> Donations.Donation_ID

  Donation_Distribution_ID: number /* 32-bit integer */; // Primary Key

  Donation_Date: string /* ISO datetime */;

  Amount: number /* currency amount */;

  /**
   * Max length: 50 characters
   */
  Payment_Type: string /* max 50 chars */;

  Payment_Type_ID: number /* 32-bit integer */;

  Is_Online: boolean;

  /**
   * Max length: 15 characters
   */
  Item_Number?: string /* max 15 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Fund_Name: string /* max 50 chars */;

  Contact_ID: number /* 32-bit integer */;

  Donor_ID: number /* 32-bit integer */;

  Statement_Type_ID: number /* 32-bit integer */;

  Statement_Frequency_ID: number /* 32-bit integer */;

  Statement_Method_ID: number /* 32-bit integer */;

  Statement_Header_ID: number /* 32-bit integer */;

  Tax_Deductible_Donations: boolean;

  Envelope_No?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Statement_Title: string /* max 50 chars */;

  Household_ID?: number /* 32-bit integer */ | null;

  Is_Soft_Credit: number /* 32-bit integer */;
}

export type VwMpGivingUnitSummaryDonationsRecord = VwMpGivingUnitSummaryDonations;

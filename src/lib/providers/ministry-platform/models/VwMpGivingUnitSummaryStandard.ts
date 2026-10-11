/**
 * Interface for vw_mp_giving_unit_summary_standard
* Table: vw_mp_giving_unit_summary_standard
 * Access Level: Read
 * Special Permissions: DataExport
 * Generated from column metadata
 */
export interface VwMpGivingUnitSummaryStandard {

  Household_ID: number /* 32-bit integer */; // Primary Key, Foreign Key -> Households.Household_ID

  /**
   * Max length: 75 characters
   */
  Household_Name: string /* max 75 chars */;

  /**
   * Max length: 105 characters
   */
  Primary_Individuals?: string /* max 105 chars */ | null;

  /**
   * Max length: 10 characters
   */
  Giving_Unit_Type: string /* max 10 chars */;

  Last_Refresh: string /* ISO datetime */;

  /**
   * Max length: 100 characters
   */
  Giving_Notes: string /* max 100 chars */;

  Giving_YTD: number /* currency amount */;

  Giving_YTD_Last_Year: number /* currency amount */;

  Giving_Variance_Last_YTD: number /* currency amount */;

  Giving_Last_Year: number /* currency amount */;

  /**
   * Max length: 50 characters
   */
  Online_Giving_Notes: string /* max 50 chars */;

  Online_Giving_YTD: number /* currency amount */;

  Online_Giving_YTD_Last_Year: number /* currency amount */;

  Online_Giving_Variance_Last_YTD: number /* currency amount */;

  Online_Giving_Last_Year: number /* currency amount */;

  Gifts_YTD: number /* 32-bit integer */;

  Gifts_YTD_Last_Year: number /* 32-bit integer */;

  Gifts_Variance_Last_YTD: number /* 32-bit integer */;

  Gifts_Last_Year: number /* 32-bit integer */;

  Online_Gifts_YTD: number /* 32-bit integer */;

  Online_Gifts_YTD_Last_Year: number /* 32-bit integer */;

  Online_Gifts_Variance_Last_YTD: number /* 32-bit integer */;

  Online_Gifts_Last_Year: number /* 32-bit integer */;

  /**
   * Max length: 120 characters
   */
  Giver_Notes: string /* max 120 chars */;

  Givers_YTD: number /* 32-bit integer */;

  Givers_Last_Year: number /* 32-bit integer */;

  /**
   * Max length: 200 characters
   */
  Comparison_Notes: string /* max 200 chars */;

  /**
   * Max length: 50 characters
   */
  Date_Range_Before: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Date_Range_After: string /* max 50 chars */;

  Giving_Before: number /* currency amount */;

  Giving_After: number /* currency amount */;

  Giving_After_Variance: number /* currency amount */;

  Gifts_Before: number /* 32-bit integer */;

  Gifts_After: number /* 32-bit integer */;

  Gifts_After_Variance: number /* 32-bit integer */;

  Online_Giving_Before: number /* currency amount */;

  Online_Giving_After: number /* currency amount */;

  Online_Giving_After_Variance: number /* currency amount */;

  Online_Gifts_Before: number /* 32-bit integer */;

  Online_Gifts_After: number /* 32-bit integer */;

  Online_Gifts_After_Variance: number /* 32-bit integer */;

  /**
   * Max length: 120 characters
   */
  HH_Member_Notes: string /* max 120 chars */;

  /**
   * Max length: 50 characters
   */
  Last_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  First_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Nickname?: string /* max 50 chars */ | null;

  /**
   * Max length: 254 characters
   */
  Email_Address?: string /* max 254 chars */ | null;

  Mobile_Phone?: string /* phone number */ | null;

  /**
   * Max length: 25 characters
   */
  Household_Position?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  Gender?: string /* max 25 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Contact_Status: string /* max 50 chars */;

  /**
   * Max length: 50 characters
   */
  Member_Status?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Participant_Type?: string /* max 50 chars */ | null;

  Age?: unknown | null;

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Home_Phone?: string /* phone number */ | null;

  Congregation_ID?: number /* 32-bit integer */ | null;

  /**
   * Max length: 50 characters
   */
  Congregation_Name?: string /* max 50 chars */ | null;

  First_HH_Donation?: string /* ISO datetime */ | null;

  Last_HH_Donation?: string /* ISO datetime */ | null;

  Months_Since_Last_HH_Donation: number /* 32-bit integer */;

  /**
   * Max length: 50 characters
   */
  Spouse_Last_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse_First_Name?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse_Nickname?: string /* max 50 chars */ | null;

  /**
   * Max length: 254 characters
   */
  Spouse_Email?: string /* max 254 chars */ | null;

  Spouse_Mobile?: string /* phone number */ | null;

  /**
   * Max length: 25 characters
   */
  Spouse_HH_Position?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  Spouse_Gender?: string /* max 25 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse_Contact_Status?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse_Member_Status?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  Spouse_Participant_Type?: string /* max 50 chars */ | null;

  Spouse_Age?: unknown | null;
}

export type VwMpGivingUnitSummaryStandardRecord = VwMpGivingUnitSummaryStandard;

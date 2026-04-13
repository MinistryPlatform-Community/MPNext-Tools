/**
 * Interface for vw_bi_MonthlyStats
* Table: vw_bi_MonthlyStats
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface VwBiMonthlystats {

  New_Contacts?: number /* 32-bit integer */ | null;

  New_Donors?: number /* 32-bit integer */ | null;

  Engaged_People?: number /* 32-bit integer */ | null;

  Total_People?: number /* 32-bit integer */ | null;

  New_Salvations?: number /* 32-bit integer */ | null;

  Rededications?: number /* 32-bit integer */ | null;

  Active_Small_Groups?: number /* 32-bit integer */ | null;

  Group_Members?: number /* 32-bit integer */ | null;

  Total_Checkins?: number /* 32-bit integer */ | null;

  Unique_Checkins?: number /* 32-bit integer */ | null;

  Active_Teams?: number /* 32-bit integer */ | null;

  Volunteers?: number /* 32-bit integer */ | null;
}

export type VwBiMonthlystatsRecord = VwBiMonthlystats;

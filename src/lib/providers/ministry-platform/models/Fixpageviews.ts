/**
 * Interface for _FixPageViews
* Table: _FixPageViews
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface Fixpageviews {

  /**
   * Max length: 2147483647 characters
   */
  Table_Name?: string /* max 2147483647 chars */ | null;

  Page_View_ID?: number /* decimal */ | null;

  /**
   * Max length: 2147483647 characters
   */
  View_Title?: string /* max 2147483647 chars */ | null;

  Page_ID?: number /* decimal */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Field_List?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  View_Clause?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Order_By?: string /* max 2147483647 chars */ | null;

  User_ID?: number /* decimal */ | null;

  User_Group_ID?: number /* decimal */ | null;
}

export type FixpageviewsRecord = Fixpageviews;

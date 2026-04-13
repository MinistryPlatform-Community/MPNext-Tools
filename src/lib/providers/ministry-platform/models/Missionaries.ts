/**
 * Interface for Missionaries
* Table: Missionaries
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface Missionaries {

  Missionary_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Missionary_Title?: string /* max 50 chars */ | null;

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 1000 characters
   */
  Ministry_Description?: string /* max 1000 chars */ | null;

  Country_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Countries.Country_ID

  Show_On_Web: boolean; // Has Default

  /**
   * Max length: 250 characters
   */
  Newsletter_Url?: string /* max 250 chars */ | null;

  Program_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Programs.Program_ID

  Monthly_Goal: number /* currency amount */;

  Agency?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  CCM_Support: number /* currency amount */;

  Restricted_Mail?: boolean | null;

  /**
   * Max length: 25 characters
   */
  Confidential_Phone?: string /* max 25 chars */ | null;

  /**
   * Max length: 254 characters
   */
  Confidential_Email?: string /* email, max 254 chars */ | null;

  Confidential_Address?: number /* 32-bit integer */ | null; // Foreign Key -> Addresses.Address_ID

  Care_Team?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  /**
   * Max length: 254 characters
   */
  Website_Email?: string /* email, max 254 chars */ | null;

  /**
   * Max length: 500 characters
   */
  Furlough?: string /* max 500 chars */ | null;

  Last_Conference?: string /* ISO datetime */ | null;

  /**
   * Max length: 50 characters
   */
  MAP_Salutation?: string /* max 50 chars */ | null;

  Last_Care_Call?: string /* ISO datetime */ | null;

  Application_Date?: string /* ISO datetime */ | null;

  /**
   * Max length: 1000 characters
   */
  General_Comments?: string /* max 1000 chars */ | null;

  /**
   * Max length: 1000 characters
   */
  Sensitive_Comments?: string /* max 1000 chars */ | null;

  /**
   * Max length: 128 characters
   */
  Name_On_Website?: string /* max 128 chars */ | null;

  /**
   * Max length: 250 characters
   */
  Facebook_Url?: string /* max 250 chars */ | null;

  Missionary_GUID: string /* GUID/UUID */; // Has Default
}

export type MissionariesRecord = Missionaries;

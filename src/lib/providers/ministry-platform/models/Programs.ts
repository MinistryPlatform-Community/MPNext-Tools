/**
 * Interface for Programs
* Table: Programs
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Programs {

  Program_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 130 characters
   */
  Program_Name: string /* max 130 chars */;

  /**
   * Max length: 255 characters
   */
  Description?: string /* max 255 chars */ | null;

  /**
   * Max length: 150 characters
   */
  Web_Page_URL?: string /* max 150 chars */ | null;

  /**
   * Max length: 150 characters
   */
  FaceBook_URL?: string /* max 150 chars */ | null;

  /**
   * Max length: 150 characters
   */
  Twitter_Username?: string /* max 150 chars */ | null;

  /**
   * Max length: 150 characters
   */
  Google_Circles?: string /* max 150 chars */ | null;

  Featured_Event?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Show_In_Ministries_Directory?: boolean | null; // Has Default

  Ministry_ID: number /* 32-bit integer */; // Foreign Key -> Ministries.Ministry_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Program_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Program_Types.Program_Type_ID

  Leadership_Team?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Ministry_Leader?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Primary_Contact: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Volunteer_Contact?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  Priority_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Priorities.Priority_ID

  /**
   * Max length: 150 characters
   */
  Video_Link_Path?: string /* max 150 chars */ | null;

  /**
   * Max length: 150 characters
   */
  Audio_Link_Path?: string /* max 150 chars */ | null;

  /**
   * Max length: 150 characters
   */
  MP_Options?: string /* max 150 chars */ | null;

  On_Connection_Card: boolean; // Has Default

  Tax_Deductible_Donations: boolean; // Has Default

  /**
   * Max length: 50 characters
   */
  Statement_Title: string /* max 50 chars */;

  Statement_Header_ID: number /* 32-bit integer */; // Foreign Key -> Statement_Headers.Statement_Header_ID

  Allow_Online_Giving: boolean; // Has Default

  Online_Sort_Order?: number /* 16-bit integer */ | null;

  Pledge_Campaign_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Pledge_Campaigns.Pledge_Campaign_ID

  Default_Target_Event?: number /* 32-bit integer */ | null; // Foreign Key -> Events.Event_ID

  On_Donation_Batch_Tool: boolean; // Has Default

  PMM_Check_Required?: boolean | null;

  /**
   * Max length: 200 characters
   */
  Badge_Title?: string /* max 200 chars */ | null;

  Disable_Recurring_Gifts?: boolean | null; // Has Default

  Available_Online: boolean; // Has Default

  /**
   * Max length: 50 characters
   */
  BG_Check_Ref_Text?: string /* max 50 chars */ | null;

  /**
   * Max length: 2147483647 characters
   */
  Welcome_Message?: string /* max 2147483647 chars */ | null;

  /**
   * Max length: 2000 characters
   */
  Custom_App_Question?: string /* max 2000 chars */ | null;

  Omit_From_Engagement_Giving: boolean; // Has Default

  /**
   * Max length: 100 characters
   */
  OLG_Fund?: string /* max 100 chars */ | null;

  /**
   * Max length: 100 characters
   */
  OLG_Sub_Fund?: string /* max 100 chars */ | null;

  /**
   * Max length: 255 characters
   */
  OLG_Url?: string /* max 255 chars */ | null;

  /**
   * Max length: 25 characters
   */
  Account_Number?: string /* max 25 chars */ | null;

  Shelby_Fund?: number /* 16-bit integer */ | null;

  Shelby_Dept?: number /* 16-bit integer */ | null;

  Shelby_Account?: number /* 32-bit integer */ | null;

  SMS_Number?: number /* 32-bit integer */ | null; // Foreign Key -> dp_SMS_Numbers.SMS_Number_ID

  /**
   * Max length: 25 characters
   */
  BB_Account_Number?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  BB_Contra_Income_Account?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  BB_Liability_Account?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  BB_Account_Number_Project_ID?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  BB_Contra_Income_Project_ID?: string /* max 25 chars */ | null;

  /**
   * Max length: 25 characters
   */
  BB_Liability_Account_Project_ID?: string /* max 25 chars */ | null;

  /**
   * Max length: 1000 characters
   */
  Vision2_Program_ID?: string /* max 1000 chars */ | null;

  /**
   * Max length: 255 characters
   */
  Vanco_Campaign_ID?: string /* max 255 chars */ | null;
}

export type ProgramsRecord = Programs;

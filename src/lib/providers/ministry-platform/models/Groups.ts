/**
 * Interface for Groups
* Table: Groups
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Groups {

  Group_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 75 characters
   */
  Group_Name: string /* max 75 chars */;

  /**
   * Max length: 2147483647 characters
   */
  Description?: string /* max 2147483647 chars */ | null;

  Group_Type_ID: number /* 32-bit integer */; // Foreign Key -> Group_Types.Group_Type_ID

  Group_Focus_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Focuses.Group_Focus_ID

  Life_Stage_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Life_Stages.Life_Stage_ID

  Ministry_ID: number /* 32-bit integer */; // Foreign Key -> Ministries.Ministry_ID

  Congregation_ID: number /* 32-bit integer */; // Foreign Key -> Congregations.Congregation_ID

  Primary_Contact: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Start_Date: string /* ISO datetime */;

  End_Date?: string /* ISO datetime */ | null;

  Kids_Welcome?: boolean | null;

  Meeting_Day_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Meeting_Days.Meeting_Day_ID

  Meeting_Time?: string /* ISO time (HH:MM:SS) */ | null;

  Meeting_Duration_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Meeting_Durations.Meeting_Duration_ID

  Meeting_Frequency_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Meeting_Frequencies.Meeting_Frequency_ID

  Group_Meeting_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Meeting_Types.Group_Meeting_Type_ID

  Required_Book?: number /* 32-bit integer */ | null; // Foreign Key -> Books.Book_ID

  Is_Child_Care_Available?: boolean | null;

  _Last_Attendance_Posted?: string /* ISO datetime */ | null; // Read Only

  _Last_Group_Member_Changed?: string /* ISO datetime */ | null; // Read Only

  Group_Is_Full: boolean; // Has Default

  Child_Care_Event?: number /* 32-bit integer */ | null;

  Max_Child_Care_Count?: number /* 32-bit integer */ | null;

  Target_Size?: number /* 32-bit integer */ | null;

  Registration_Start?: string /* ISO datetime */ | null;

  Registration_End?: string /* ISO datetime */ | null;

  Available_Online: boolean; // Has Default

  Meets_Online: boolean; // Has Default

  Offsite_Meeting_Address?: number /* 32-bit integer */ | null; // Foreign Key -> Addresses.Address_ID

  Default_Room?: number /* 32-bit integer */ | null; // Foreign Key -> Rooms.Room_ID

  Confidential: boolean; // Has Default

  Parent_Group?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Coach?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 64 characters
   */
  Facebook_Group?: string /* max 64 chars */ | null;

  Reason_Ended?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Ended_Reasons.Group_Ended_Reason_ID

  Descended_From?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Priority_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Priorities.Priority_ID

  Create_Outlook_List?: boolean | null;

  "Secure_Check-in": boolean; // Has Default

  Suppress_Nametag: boolean; // Has Default

  Suppress_Care_Note: boolean; // Has Default

  On_Classroom_Manager: boolean; // Has Default

  Promote_to_Group?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Age_in_Months_to_Promote?: number /* 32-bit integer */ | null;

  Promote_Weekly: boolean; // Has Default

  Promotion_Date?: string /* ISO date (YYYY-MM-DD) */ | null;

  Promote_Participants_Only: boolean; // Has Default

  Send_Attendance_Notification: boolean; // Has Default

  Send_Service_Notification: boolean; // Has Default

  Enable_Discussion: boolean; // Has Default

  /**
   * Max length: 50 characters
   */
  External_System?: string /* max 50 chars */ | null;

  /**
   * Max length: 50 characters
   */
  External_ID?: string /* max 50 chars */ | null;

  Require_BG_Check: boolean; // Has Default

  _Approved: boolean; // Read Only, Has Default

  Available_On_App?: boolean | null;

  SMS_Number?: number /* 32-bit integer */ | null; // Foreign Key -> dp_SMS_Numbers.SMS_Number_ID

  Default_Meeting_Room?: number /* 32-bit integer */ | null;

  Create_Next_Meeting: boolean; // Has Default

  Next_Scheduled_Meeting?: string /* ISO datetime */ | null;

  /**
   * Max length: 256 characters
   */
  External_Registration_Url?: string /* max 256 chars */ | null;
}

export type GroupsRecord = Groups;

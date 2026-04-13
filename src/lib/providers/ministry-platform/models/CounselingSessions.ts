/**
 * Interface for Counseling_Sessions
* Table: Counseling_Sessions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface CounselingSessions {

  Counseling_Session_ID: number /* 32-bit integer */; // Primary Key

  Counseling_Engagement_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Engagements.Counseling_Engagement_ID

  Session_Start_Date: string /* ISO datetime */;

  Session_End_Date: string /* ISO datetime */;

  Session_With: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Room_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Rooms.Room_ID

  Counseling_Session_Type_ID: number /* 32-bit integer */; // Foreign Key -> Counseling_Session_Types.Counseling_Session_Type_ID

  Room_Approved: boolean; // Has Default
}

export type CounselingSessionsRecord = CounselingSessions;

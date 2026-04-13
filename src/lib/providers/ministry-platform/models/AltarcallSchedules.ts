/**
 * Interface for AltarCall_Schedules
* Table: AltarCall_Schedules
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface AltarcallSchedules {

  AltarCall_Schedule_ID: number /* 32-bit integer */; // Primary Key

  AltarCall_Contact_ID: number /* 32-bit integer */; // Foreign Key -> AltarCall_Contacts.AltarCall_Contact_ID

  Day_of_Week: number /* 32-bit integer */; // Foreign Key -> Meeting_Days.Meeting_Day_ID

  Start_Time: string /* ISO time (HH:MM:SS) */;

  End_Time: string /* ISO time (HH:MM:SS) */;

  Enabled: boolean; // Has Default
}

export type AltarcallSchedulesRecord = AltarcallSchedules;

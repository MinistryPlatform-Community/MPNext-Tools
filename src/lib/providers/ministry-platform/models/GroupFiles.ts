/**
 * Interface for Group_Files
* Table: Group_Files
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface GroupFiles {

  Group_File_ID: number /* 32-bit integer */; // Primary Key

  Group_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Groups.Group_ID

  Group_Type_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Types.Group_Type_ID

  Group_Focus_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Group_Focuses.Group_Focus_ID

  /**
   * Max length: 500 characters
   */
  Notes?: string /* max 500 chars */ | null;

  Start_Date: string /* ISO datetime */; // Has Default

  Visible: boolean; // Has Default

  LeaderOnly: boolean; // Has Default

  User_ID: number /* 32-bit integer */; // Foreign Key -> dp_Users.User_ID

  Tag_ID?: number /* 32-bit integer */ | null; // Foreign Key -> Tags.Tag_ID
}

export type GroupFilesRecord = GroupFiles;

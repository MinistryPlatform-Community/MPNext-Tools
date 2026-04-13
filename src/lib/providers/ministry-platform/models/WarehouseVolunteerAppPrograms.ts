/**
 * Interface for Warehouse_Volunteer_App_Programs
* Table: Warehouse_Volunteer_App_Programs
 * Access Level: Read
 * Special Permissions: None
 * Generated from column metadata
 */
export interface WarehouseVolunteerAppPrograms {

  Program_ID: number /* 32-bit integer */; // Primary Key, Foreign Key -> Programs.Program_ID

  Age_0_10_Null: number /* 32-bit integer */;

  Age_10_19: number /* 32-bit integer */;

  Age_20_29: number /* 32-bit integer */;

  Age_30_39: number /* 32-bit integer */;

  Age_40_49: number /* 32-bit integer */;

  Age_50_59: number /* 32-bit integer */;

  Age_60_69: number /* 32-bit integer */;

  Age_70_79: number /* 32-bit integer */;

  Age_80_Up: number /* 32-bit integer */;

  Last_Updated: string /* ISO datetime */; // Has Default
}

export type WarehouseVolunteerAppProgramsRecord = WarehouseVolunteerAppPrograms;

/**
 * Interface for Equipment_CheckOuts
* Table: Equipment_CheckOuts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface EquipmentCheckouts {

  Equipment_CheckOut_ID: number /* 32-bit integer */; // Primary Key

  Equipment_ID: number /* 32-bit integer */; // Foreign Key -> Equipment.Equipment_ID

  CheckOut_Date: string /* ISO datetime */;

  CheckOut_Person: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  Expected_Return_Date: string /* ISO datetime */;

  CheckIn_Date?: string /* ISO datetime */ | null;

  CheckIn_Person?: number /* 32-bit integer */ | null; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 512 characters
   */
  Notes?: string /* max 512 chars */ | null;
}

export type EquipmentCheckoutsRecord = EquipmentCheckouts;

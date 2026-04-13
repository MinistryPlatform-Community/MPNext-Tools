/**
 * Interface for AltarCall_Exemptions
* Table: AltarCall_Exemptions
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface AltarcallExemptions {

  AltarCall_Exemption_ID: number /* 32-bit integer */; // Primary Key

  AltarCall_Contact_ID: number /* 32-bit integer */; // Foreign Key -> AltarCall_Contacts.AltarCall_Contact_ID

  Start_Date: string /* ISO datetime */;

  End_Date: string /* ISO datetime */;
}

export type AltarcallExemptionsRecord = AltarcallExemptions;

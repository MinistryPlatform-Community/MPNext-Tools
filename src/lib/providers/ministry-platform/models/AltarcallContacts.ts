/**
 * Interface for AltarCall_Contacts
* Table: AltarCall_Contacts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface AltarcallContacts {

  AltarCall_Contact_ID: number /* 32-bit integer */; // Primary Key

  Contact_ID: number /* 32-bit integer */; // Foreign Key -> Contacts.Contact_ID

  /**
   * Max length: 50 characters
   */
  Override_Phone?: string /* max 50 chars */ | null;

  Enabled: boolean; // Has Default
}

export type AltarcallContactsRecord = AltarcallContacts;

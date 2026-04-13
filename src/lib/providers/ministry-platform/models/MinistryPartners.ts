/**
 * Interface for Ministry_Partners
* Table: Ministry_Partners
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach
 * Generated from column metadata
 */
export interface MinistryPartners {

  Ministry_Partner_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 150 characters
   */
  Ministry_Partner: string /* max 150 chars */;

  /**
   * Max length: 512 characters
   */
  Description?: string /* max 512 chars */ | null;

  /**
   * Max length: 256 characters
   */
  Website?: string /* max 256 chars */ | null;

  Show_Online: boolean; // Has Default

  Feature_On_Campus: boolean; // Has Default
}

export type MinistryPartnersRecord = MinistryPartners;

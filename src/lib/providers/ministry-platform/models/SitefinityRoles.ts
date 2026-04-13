/**
 * Interface for Sitefinity_Roles
* Table: Sitefinity_Roles
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface SitefinityRoles {

  Sitefinity_Role_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 50 characters
   */
  Sitefinity_Role_Name: string /* max 50 chars */;

  /**
   * Max length: 36 characters
   */
  Sitefinity_Role_Guid: string /* max 36 chars */;

  /**
   * Max length: 255 characters
   */
  Sitefinity_Role_Description?: string /* max 255 chars */ | null;

  /**
   * Max length: 150 characters
   */
  Realm: string /* max 150 chars */;

  Role_ID?: number /* 32-bit integer */ | null; // Foreign Key -> dp_Roles.Role_ID
}

export type SitefinityRolesRecord = SitefinityRoles;

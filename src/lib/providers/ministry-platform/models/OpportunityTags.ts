/**
 * Interface for Opportunity_Tags
* Table: Opportunity_Tags
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: None
 * Generated from column metadata
 */
export interface OpportunityTags {

  Opportunity_Tag_ID: number /* 32-bit integer */; // Primary Key

  Opportunity_ID: number /* 32-bit integer */; // Foreign Key -> Opportunities.Opportunity_ID

  Tag_ID: number /* 32-bit integer */; // Foreign Key -> Tags.Tag_ID
}

export type OpportunityTagsRecord = OpportunityTags;

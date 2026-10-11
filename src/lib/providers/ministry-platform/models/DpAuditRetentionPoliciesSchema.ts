import { z } from 'zod';

export const DpAuditRetentionPoliciesSchema = z.object({
  Audit_Retention_Policy_ID: z.number().int(),
  Retention_Type_ID: z.number().int(),
  Table_Name: z.unknown().nullable(),
  Audit_Type_ID: z.number().int().nullable(),
  Audit_Retention_Days: z.number().int(),
  Is_Active: z.boolean(),
  Max_Audits_Per_Run: z.number().int(),
});

export type DpAuditRetentionPoliciesInput = z.infer<typeof DpAuditRetentionPoliciesSchema>;

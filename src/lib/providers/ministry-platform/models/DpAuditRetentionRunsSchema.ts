import { z } from 'zod';

export const DpAuditRetentionRunsSchema = z.object({
  Audit_Retention_Run_ID: z.number().int(),
  Run_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Active_Erase_Policies: z.number().int(),
  Active_Retain_Policies: z.number().int(),
  Max_Minutes: z.number().int(),
  Policies_Run: z.number().int(),
  Duration_Minutes: z.number().int(),
  Deleted_Audits: z.number().int(),
  Deleted_Details: z.number().int(),
  Remaining_Audits: z.number().int(),
  Remaining_Details: z.number().int(),
});

export type DpAuditRetentionRunsInput = z.infer<typeof DpAuditRetentionRunsSchema>;

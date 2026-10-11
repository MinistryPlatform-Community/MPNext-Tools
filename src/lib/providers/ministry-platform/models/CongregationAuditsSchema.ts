import { z } from 'zod';

export const CongregationAuditsSchema = z.object({
  Congregation_Audit_ID: z.number().int(),
  Household_ID: z.number().int(),
  Change_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Prior_Congregation: z.number().int(),
  New_Congregation: z.number().int(),
  Notes: z.string().max(300).nullable(),
});

export type CongregationAuditsInput = z.infer<typeof CongregationAuditsSchema>;

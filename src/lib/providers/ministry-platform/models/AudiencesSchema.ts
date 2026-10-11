import { z } from 'zod';

export const AudiencesSchema = z.object({
  Audience_ID: z.number().int(),
  Audience_Name: z.string().max(50),
  Description: z.string().max(255).nullable(),
  Processing_Order: z.number().int(),
  Active: z.boolean(),
  Last_Update_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Last_Update_Status: z.string().max(256).nullable(),
  Next_Update_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type AudiencesInput = z.infer<typeof AudiencesSchema>;

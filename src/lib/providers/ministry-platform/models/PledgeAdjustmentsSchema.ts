import { z } from 'zod';

export const PledgeAdjustmentsSchema = z.object({
  Pledge_Adjustment_ID: z.number().int(),
  Pledge_ID: z.number().int(),
  Pledge_Adjustment_Type_ID: z.number().int(),
  Adjustment_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Adjustment_Amount: z.number(),
  Prior_Amount: z.number(),
  Notes: z.string().max(2000).nullable(),
});

export type PledgeAdjustmentsInput = z.infer<typeof PledgeAdjustmentsSchema>;

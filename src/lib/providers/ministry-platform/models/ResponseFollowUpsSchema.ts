import { z } from 'zod';

export const ResponseFollowUpsSchema = z.object({
  Response_Follow_Up_ID: z.number().int(),
  Response_ID: z.number().int(),
  Follow_Up_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Action_Type_ID: z.number().int(),
  Notes: z.string().max(1000),
  Made_By: z.number().int().nullable(),
});

export type ResponseFollowUpsInput = z.infer<typeof ResponseFollowUpsSchema>;

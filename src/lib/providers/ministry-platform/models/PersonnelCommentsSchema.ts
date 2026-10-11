import { z } from 'zod';

export const PersonnelCommentsSchema = z.object({
  Personnel_Comment_ID: z.number().int(),
  Personnel_ID: z.number().int(),
  Comment_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Personnel_Comment_Type_ID: z.number().int(),
  Comment: z.string().max(2000),
});

export type PersonnelCommentsInput = z.infer<typeof PersonnelCommentsSchema>;

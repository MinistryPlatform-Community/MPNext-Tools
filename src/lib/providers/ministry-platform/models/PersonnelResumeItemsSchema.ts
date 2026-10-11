import { z } from 'zod';

export const PersonnelResumeItemsSchema = z.object({
  Personnel_Resume_Item_ID: z.number().int(),
  Personnel_ID: z.number().int(),
  Resume_Item: z.string().max(249),
  Resume_Item_Type_ID: z.number().int(),
  Resume_Item_Notes: z.string().max(2000).nullable(),
  Date_Started: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Date_Achieved: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Date_Expires: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Location_ID: z.number().int().nullable(),
  Place: z.string().max(500).nullable(),
});

export type PersonnelResumeItemsInput = z.infer<typeof PersonnelResumeItemsSchema>;

import { z } from 'zod';

export const GroupInquiriesSchema = z.object({
  Group_Inquiry_ID: z.number().int(),
  Group_ID: z.number().int(),
  Contact_ID: z.number().int().nullable(),
  Inquiry_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  First_Name: z.string().max(50).nullable(),
  Last_Name: z.string().max(50).nullable(),
  Phone: z.string().nullable(),
  Email: z.string().max(254).nullable(),
  Comments: z.string().max(1000).nullable(),
  Placed: z.boolean().nullable(),
  _From_Group_Finder: z.boolean().nullable(),
});

export type GroupInquiriesInput = z.infer<typeof GroupInquiriesSchema>;

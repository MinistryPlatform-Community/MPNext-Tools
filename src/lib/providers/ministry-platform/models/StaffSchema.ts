import { z } from 'zod';

export const StaffSchema = z.object({
  Staff_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Title: z.string().max(50),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Show_Online: z.boolean(),
  Online_Order: z.unknown(),
  Facebook_URL: z.string().url().nullable(),
});

export type StaffInput = z.infer<typeof StaffSchema>;

import { z } from 'zod';

export const ContactHouseholdsSchema = z.object({
  Contact_Household_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Household_ID: z.number().int(),
  Household_Position_ID: z.number().int(),
  Household_Type_ID: z.number().int().nullable(),
  Primary_Family: z.boolean(),
  Notes: z.string().max(2000).nullable(),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type ContactHouseholdsInput = z.infer<typeof ContactHouseholdsSchema>;

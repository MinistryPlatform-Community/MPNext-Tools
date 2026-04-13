import { z } from 'zod';

export const ClassifiedsSchema = z.object({
  Classified_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Classified_Ad: z.string().max(2147483647),
  Show_Home_Phone: z.boolean(),
  Show_Email: z.boolean(),
  Classified_Category_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Approved: z.boolean(),
  Congregation_ID: z.number().int().nullable(),
  Show_Mobile_Phone: z.boolean(),
  Household_ID: z.number().int(),
});

export type ClassifiedsInput = z.infer<typeof ClassifiedsSchema>;

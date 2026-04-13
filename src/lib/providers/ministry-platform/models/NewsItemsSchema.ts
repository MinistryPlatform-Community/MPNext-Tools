import { z } from 'zod';

export const NewsItemsSchema = z.object({
  News_Item_ID: z.number().int(),
  Title: z.string().max(150).nullable(),
  Summary: z.string().max(250).nullable(),
  Start_Date: z.string().datetime().nullable(),
  End_Date: z.string().datetime().nullable(),
  Contact_ID: z.number().int().nullable(),
  WebHTML: z.string().max(2147483647).nullable(),
});

export type NewsItemsInput = z.infer<typeof NewsItemsSchema>;

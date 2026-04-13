import { z } from 'zod';

export const ClassifiedCategoriesSchema = z.object({
  Classified_Category_ID: z.number().int(),
  Name: z.string().max(50),
  Hex_Color: z.string().max(7).nullable(),
});

export type ClassifiedCategoriesInput = z.infer<typeof ClassifiedCategoriesSchema>;

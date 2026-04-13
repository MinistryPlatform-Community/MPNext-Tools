import { z } from 'zod';

export const ShirtSizesSchema = z.object({
  Shirt_Size_ID: z.number().int(),
  Shirt_Size: z.string().max(50),
  Online_Sort_Order: z.number().int().nullable(),
});

export type ShirtSizesInput = z.infer<typeof ShirtSizesSchema>;

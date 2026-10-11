import { z } from 'zod';

export const WaitTypesSchema = z.object({
  Wait_Type_ID: z.number().int(),
  Wait_Type: z.string().max(60),
  Category: z.string().max(60),
});

export type WaitTypesInput = z.infer<typeof WaitTypesSchema>;

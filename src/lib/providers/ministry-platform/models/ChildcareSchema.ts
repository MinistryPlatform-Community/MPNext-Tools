import { z } from 'zod';

export const ChildcareSchema = z.object({
  Childcare_ID: z.number().int(),
  Parent: z.number().int(),
  Child: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
});

export type ChildcareInput = z.infer<typeof ChildcareSchema>;

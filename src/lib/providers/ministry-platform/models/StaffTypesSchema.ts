import { z } from 'zod';

export const StaffTypesSchema = z.object({
  Staff_Type_ID: z.number().int(),
  Staff_Type: z.string().max(50),
});

export type StaffTypesInput = z.infer<typeof StaffTypesSchema>;

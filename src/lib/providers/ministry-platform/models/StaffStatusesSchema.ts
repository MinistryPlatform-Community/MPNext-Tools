import { z } from 'zod';

export const StaffStatusesSchema = z.object({
  Staff_Status_ID: z.number().int(),
  Staff_Status: z.string().max(50),
});

export type StaffStatusesInput = z.infer<typeof StaffStatusesSchema>;

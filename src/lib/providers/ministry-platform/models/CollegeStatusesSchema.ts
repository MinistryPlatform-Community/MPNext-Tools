import { z } from 'zod';

export const CollegeStatusesSchema = z.object({
  College_Status_ID: z.number().int(),
  College_Status: z.string().max(50),
});

export type CollegeStatusesInput = z.infer<typeof CollegeStatusesSchema>;

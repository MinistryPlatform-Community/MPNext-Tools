import { z } from 'zod';

export const VolunteerAppStatusReasonsSchema = z.object({
  Status_Reason_ID: z.number().int(),
  Status_Reason: z.string().max(50),
});

export type VolunteerAppStatusReasonsInput = z.infer<typeof VolunteerAppStatusReasonsSchema>;

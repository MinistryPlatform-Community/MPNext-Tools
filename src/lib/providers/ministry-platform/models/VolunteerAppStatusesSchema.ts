import { z } from 'zod';

export const VolunteerAppStatusesSchema = z.object({
  Volunteer_App_Status_ID: z.number().int(),
  Status: z.string().max(128),
});

export type VolunteerAppStatusesInput = z.infer<typeof VolunteerAppStatusesSchema>;

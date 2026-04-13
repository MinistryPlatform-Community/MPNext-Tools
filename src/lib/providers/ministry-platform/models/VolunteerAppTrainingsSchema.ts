import { z } from 'zod';

export const VolunteerAppTrainingsSchema = z.object({
  Volunteer_App_Training_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  Training_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Completion_Date: z.string().datetime().nullable(),
  Training_Score: z.number().nullable(),
  Vol_Training_Guid: z.string().uuid(),
});

export type VolunteerAppTrainingsInput = z.infer<typeof VolunteerAppTrainingsSchema>;

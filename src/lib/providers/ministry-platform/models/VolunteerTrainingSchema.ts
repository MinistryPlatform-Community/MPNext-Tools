import { z } from 'zod';

export const VolunteerTrainingSchema = z.object({
  Training_ID: z.number().int(),
  Training_Name: z.string().max(150),
  Description: z.string().max(2048).nullable(),
  Renewal_Days: z.number().int().nullable(),
  Minimum_Score: z.number().nullable(),
  Training_GUID: z.string().uuid(),
});

export type VolunteerTrainingInput = z.infer<typeof VolunteerTrainingSchema>;

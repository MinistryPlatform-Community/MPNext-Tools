import { z } from 'zod';

export const VolunteerTrainingMediaSchema = z.object({
  Volunteer_Training_Media_ID: z.number().int(),
  Training_ID: z.number().int(),
  Media_Title: z.string().max(128),
  Media_Url: z.string().max(256),
  Sort_Order: z.number().int().nullable(),
});

export type VolunteerTrainingMediaInput = z.infer<typeof VolunteerTrainingMediaSchema>;

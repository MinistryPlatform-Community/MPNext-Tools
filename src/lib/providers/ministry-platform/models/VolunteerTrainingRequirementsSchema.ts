import { z } from 'zod';

export const VolunteerTrainingRequirementsSchema = z.object({
  Volunteer_Training_Requirement_ID: z.number().int(),
  Training_ID: z.number().int(),
  Program_ID: z.number().int().nullable(),
  Group_ID: z.number().int().nullable(),
});

export type VolunteerTrainingRequirementsInput = z.infer<typeof VolunteerTrainingRequirementsSchema>;

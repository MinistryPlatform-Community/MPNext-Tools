import { z } from 'zod';

export const VolunteerAreasSchema = z.object({
  Volunteer_Area_ID: z.number().int(),
  Volunteer_Area: z.string().max(50),
  Active: z.boolean(),
});

export type VolunteerAreasInput = z.infer<typeof VolunteerAreasSchema>;

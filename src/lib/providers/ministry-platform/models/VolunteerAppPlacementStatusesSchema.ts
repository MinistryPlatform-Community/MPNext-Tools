import { z } from 'zod';

export const VolunteerAppPlacementStatusesSchema = z.object({
  Placement_Status_ID: z.number().int(),
  Placement_Status: z.string().max(128),
});

export type VolunteerAppPlacementStatusesInput = z.infer<typeof VolunteerAppPlacementStatusesSchema>;

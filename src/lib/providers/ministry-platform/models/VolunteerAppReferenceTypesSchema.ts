import { z } from 'zod';

export const VolunteerAppReferenceTypesSchema = z.object({
  Volunteer_App_Reference_Type_ID: z.number().int(),
  Reference_Type: z.string().max(50),
});

export type VolunteerAppReferenceTypesInput = z.infer<typeof VolunteerAppReferenceTypesSchema>;

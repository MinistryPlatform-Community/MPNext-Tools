import { z } from 'zod';

export const VolunteerAppRedflagsSchema = z.object({
  Red_Flag_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  User_ID: z.number().int(),
  Notes: z.string().max(2048).nullable(),
  Red_Flag_Status_ID: z.number().int(),
  Start_Date: z.string().datetime(),
});

export type VolunteerAppRedflagsInput = z.infer<typeof VolunteerAppRedflagsSchema>;

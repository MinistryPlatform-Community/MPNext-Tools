import { z } from 'zod';

export const VolunteerAppProgramsSchema = z.object({
  Volunteer_App_Program_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  Program_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Date_Placed: z.string().datetime().nullable(),
  End_Date: z.string().datetime().nullable(),
  Placement_Status_ID: z.number().int().nullable(),
  Notes: z.string().max(1024).nullable(),
  Custom_App_Answer: z.string().max(1024).nullable(),
  Opportunity_ID: z.number().int().nullable(),
});

export type VolunteerAppProgramsInput = z.infer<typeof VolunteerAppProgramsSchema>;

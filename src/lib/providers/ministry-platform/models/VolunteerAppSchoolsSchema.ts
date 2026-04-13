import { z } from 'zod';

export const VolunteerAppSchoolsSchema = z.object({
  Volunteer_App_School_ID: z.number().int(),
  Volunteer_App_Employment_App_ID: z.number().int(),
  School_Name: z.string().max(50).nullable(),
  Grade_Complete: z.string().max(50).nullable(),
  Major: z.string().max(50).nullable(),
  Completion_Date: z.string().datetime().nullable(),
  School_Address: z.string().max(512).nullable(),
});

export type VolunteerAppSchoolsInput = z.infer<typeof VolunteerAppSchoolsSchema>;

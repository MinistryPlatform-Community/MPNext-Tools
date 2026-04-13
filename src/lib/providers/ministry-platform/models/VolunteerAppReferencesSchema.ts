import { z } from 'zod';

export const VolunteerAppReferencesSchema = z.object({
  Reference_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  Name: z.string().max(150),
  Phone: z.string().max(30).nullable(),
  Email: z.string().max(255).nullable(),
  Know_How: z.string().max(255).nullable(),
  Notes: z.string().max(2147483647).nullable(),
  How_Well_Know: z.string().max(255).nullable(),
  Do_You_Recommend: z.string().max(255).nullable(),
  Recommend_With_Kids: z.string().max(255).nullable(),
  Start_Date: z.string().datetime(),
  Date_Completed: z.string().datetime().nullable(),
  Reference_GUID: z.string().uuid(),
  Source: z.string().max(50).nullable(),
  Reference_Type: z.number().int(),
});

export type VolunteerAppReferencesInput = z.infer<typeof VolunteerAppReferencesSchema>;

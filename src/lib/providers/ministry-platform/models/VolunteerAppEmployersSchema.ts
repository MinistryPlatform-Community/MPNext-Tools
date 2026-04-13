import { z } from 'zod';

export const VolunteerAppEmployersSchema = z.object({
  Volunteer_App_Employer_ID: z.number().int(),
  Volunteer_App_Employment_App_ID: z.number().int(),
  Employer: z.string().max(50).nullable(),
  Employer_Type: z.string().max(50).nullable(),
  Position: z.string().max(50).nullable(),
  Still_Employed: z.boolean().nullable(),
  Employment_Start_Date: z.string().datetime().nullable(),
  Employment_End_Date: z.string().datetime().nullable(),
  Reason_For_Leaving: z.string().max(256).nullable(),
  Supervisor: z.string().max(128).nullable(),
  Company_Address: z.string().max(512).nullable(),
  Phone: z.string().max(50).nullable(),
  Salary: z.string().max(256).nullable(),
});

export type VolunteerAppEmployersInput = z.infer<typeof VolunteerAppEmployersSchema>;

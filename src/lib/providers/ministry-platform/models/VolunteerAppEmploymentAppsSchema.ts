import { z } from 'zod';

export const VolunteerAppEmploymentAppsSchema = z.object({
  Volunteer_App_Employment_App_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  Operate_Computer: z.boolean(),
  Word: z.boolean(),
  Excel: z.boolean(),
  Powerpoint: z.boolean(),
  Other_Skills: z.string().max(512).nullable(),
  Emp_Circumstance: z.boolean(),
  Emp_Circumstance_Reason: z.string().max(512).nullable(),
  Expected_Salary: z.string().max(256).nullable(),
  Resume: z.string().max(2147483647).nullable(),
  Cover_Letter: z.string().max(2147483647).nullable(),
});

export type VolunteerAppEmploymentAppsInput = z.infer<typeof VolunteerAppEmploymentAppsSchema>;

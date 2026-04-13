import { z } from 'zod';

export const EmploymentApplicantsSchema = z.object({
  Employment_Applicant_ID: z.number().int(),
  Volunteer_App_ID: z.number().int(),
  Employment_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  HR_Notes: z.string().max(3000).nullable(),
});

export type EmploymentApplicantsInput = z.infer<typeof EmploymentApplicantsSchema>;

import { z } from 'zod';

export const EmploymentSchema = z.object({
  Employment_ID: z.number().int(),
  Title: z.string().max(128),
  Reports_To: z.string().max(75).nullable(),
  Description: z.string().max(512),
  Congregation_ID: z.number().int(),
  Ministry_ID: z.number().int().nullable(),
  FLSA_Status_ID: z.number().int(),
  Hours: z.string().max(128).nullable(),
  Responsibilities: z.string().max(2147483647).nullable(),
  Required_Skills: z.string().max(2147483647).nullable(),
  Expectations: z.string().max(2147483647).nullable(),
  Other_Qualifications: z.string().max(2147483647).nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
});

export type EmploymentInput = z.infer<typeof EmploymentSchema>;

import { z } from 'zod';

export const CollegeSemestersSchema = z.object({
  Semester_ID: z.number().int(),
  Semester_Name: z.string().max(50),
  Semester_Start: z.string().datetime(),
  Semester_End: z.string().datetime(),
  Semester_Number: z.number().nullable(),
  Usage_Code: z.string().max(6).nullable(),
  Semester_Tittle: z.string().max(20).nullable(),
  Semester_Begin_Date: z.string().datetime().nullable(),
  Semester_End_Date: z.string().datetime().nullable(),
});

export type CollegeSemestersInput = z.infer<typeof CollegeSemestersSchema>;

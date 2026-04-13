import { z } from 'zod';

export const CollegeStudentSemestersSchema = z.object({
  Student_Semester_ID: z.number().int(),
  Student_ID: z.number().int(),
  Semester_ID: z.number().int(),
  Church_Staff: z.boolean(),
});

export type CollegeStudentSemestersInput = z.infer<typeof CollegeStudentSemestersSchema>;

import { z } from 'zod';

export const CollegeStudentMappingTempSchema = z.object({
  Contact_ID: z.number().int(),
  Student_ID: z.string().max(15),
});

export type CollegeStudentMappingTempInput = z.infer<typeof CollegeStudentMappingTempSchema>;

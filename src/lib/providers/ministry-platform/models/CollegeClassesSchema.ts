import { z } from 'zod';

export const CollegeClassesSchema = z.object({
  Class_ID: z.number().int(),
  Class_Name: z.string().max(100),
  Course_Number: z.string().max(50),
});

export type CollegeClassesInput = z.infer<typeof CollegeClassesSchema>;

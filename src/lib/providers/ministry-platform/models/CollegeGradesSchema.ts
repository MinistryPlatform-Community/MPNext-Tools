import { z } from 'zod';

export const CollegeGradesSchema = z.object({
  Grade_ID: z.number().int(),
  Grade_Text: z.string().max(50),
  Grade_Points: z.number().nullable(),
  Grade_Factored: z.boolean(),
  Credit_Conferred: z.boolean().nullable(),
});

export type CollegeGradesInput = z.infer<typeof CollegeGradesSchema>;

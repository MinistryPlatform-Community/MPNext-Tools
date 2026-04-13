import { z } from 'zod';

export const VwCcmProgramvolunteercountsSchema = z.object({
  Program_ID: z.number().int(),
  Count: z.number().int().nullable(),
  Program_Name: z.string().max(130),
  Congregation_Name: z.string().max(50),
});

export type VwCcmProgramvolunteercountsInput = z.infer<typeof VwCcmProgramvolunteercountsSchema>;

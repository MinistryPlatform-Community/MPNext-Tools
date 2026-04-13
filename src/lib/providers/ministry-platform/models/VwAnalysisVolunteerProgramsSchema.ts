import { z } from 'zod';

export const VwAnalysisVolunteerProgramsSchema = z.object({
  Program_ID: z.number().int(),
  Program_Name: z.string().max(130).nullable(),
  Congregation_Name: z.string().max(50).nullable(),
  Age_NULL: z.number().int().nullable(),
  Age_0_10: z.number().int().nullable(),
  Age_10_19: z.number().int().nullable(),
  Age_20_29: z.number().int().nullable(),
  Age_30_39: z.number().int().nullable(),
  Age_40_49: z.number().int().nullable(),
  Age_50_59: z.number().int().nullable(),
  Age_60_69: z.number().int().nullable(),
  Age_70_79: z.number().int().nullable(),
  Age_80_Up: z.number().int().nullable(),
});

export type VwAnalysisVolunteerProgramsInput = z.infer<typeof VwAnalysisVolunteerProgramsSchema>;

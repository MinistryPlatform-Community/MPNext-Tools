import { z } from 'zod';

export const WarehouseVolunteerAppProgramsSchema = z.object({
  Program_ID: z.number().int(),
  Age_0_10_Null: z.number().int(),
  Age_10_19: z.number().int(),
  Age_20_29: z.number().int(),
  Age_30_39: z.number().int(),
  Age_40_49: z.number().int(),
  Age_50_59: z.number().int(),
  Age_60_69: z.number().int(),
  Age_70_79: z.number().int(),
  Age_80_Up: z.number().int(),
  Last_Updated: z.string().datetime(),
});

export type WarehouseVolunteerAppProgramsInput = z.infer<typeof WarehouseVolunteerAppProgramsSchema>;

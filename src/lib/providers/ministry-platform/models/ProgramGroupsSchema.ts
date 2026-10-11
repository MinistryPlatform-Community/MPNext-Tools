import { z } from 'zod';

export const ProgramGroupsSchema = z.object({
  Program_Group_ID: z.number().int(),
  Program_ID: z.number().int(),
  Group_ID: z.number().int(),
  Room_ID: z.number().int().nullable(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type ProgramGroupsInput = z.infer<typeof ProgramGroupsSchema>;

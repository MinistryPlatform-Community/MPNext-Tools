import { z } from 'zod';

export const StatisticsLogsSchema = z.object({
  Log_ID: z.number().int(),
  Log_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Table_Name: z.string().max(75),
  Duration: z.number().int().nullable(),
  Sample_Percent: z.unknown().nullable(),
});

export type StatisticsLogsInput = z.infer<typeof StatisticsLogsSchema>;

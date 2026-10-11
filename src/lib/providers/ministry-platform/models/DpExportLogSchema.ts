import { z } from 'zod';

export const DpExportLogSchema = z.object({
  Export_ID: z.number().int(),
  Date_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  User_Name: z.string().max(256).nullable(),
  User_ID: z.number().int(),
  Table_Name: z.unknown(),
  View_Title: z.string().max(255).nullable(),
  Record_Count: z.number().int(),
});

export type DpExportLogInput = z.infer<typeof DpExportLogSchema>;

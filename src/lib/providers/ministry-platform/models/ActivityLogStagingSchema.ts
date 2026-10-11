import { z } from 'zod';

export const ActivityLogStagingSchema = z.object({
  Activity_Log_Staging_ID: z.number().int(),
  Page_ID: z.number().int(),
  Last_PK: z.number().int(),
  Last_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
});

export type ActivityLogStagingInput = z.infer<typeof ActivityLogStagingSchema>;

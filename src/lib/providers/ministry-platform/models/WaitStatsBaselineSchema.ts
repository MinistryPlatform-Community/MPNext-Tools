import { z } from 'zod';

export const WaitStatsBaselineSchema = z.object({
  WaitType: z.string().max(60),
  WaitingTasksCount: z.number().int(),
  WaitTimeMS: z.number().int(),
  MaxWaitTimeMS: z.number().int(),
  SignalWaitTimeMS: z.number().int(),
  SnapshotDT: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
});

export type WaitStatsBaselineInput = z.infer<typeof WaitStatsBaselineSchema>;

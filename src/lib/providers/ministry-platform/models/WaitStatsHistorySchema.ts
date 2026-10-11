import { z } from 'zod';

export const WaitStatsHistorySchema = z.object({
  WaitStatsID: z.number().int(),
  SnapshotDT: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  WaitType: z.string().max(60),
  WaitingTasksCount: z.number().int(),
  WaitTimeMS: z.number().int(),
  MaxWaitTimeMS: z.number().int(),
  SignalWaitTimeMS: z.number().int(),
  ResourceWaitTimeMS: z.number().int().nullable(),
  SnapshotHour: z.number().int().nullable(),
  SnapshotDay: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)").nullable(),
  SnapshotISOYear: z.number().int().nullable(),
  SnapshotWeek: z.number().int().nullable(),
  SnapshotMonth: z.number().int().nullable(),
  SnapshotYear: z.number().int().nullable(),
});

export type WaitStatsHistoryInput = z.infer<typeof WaitStatsHistorySchema>;

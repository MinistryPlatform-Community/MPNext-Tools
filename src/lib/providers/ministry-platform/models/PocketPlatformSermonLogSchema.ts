import { z } from 'zod';

export const PocketPlatformSermonLogSchema = z.object({
  Sermon_Log_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Source: z.string().max(50),
  Data: z.string().max(2000),
});

export type PocketPlatformSermonLogInput = z.infer<typeof PocketPlatformSermonLogSchema>;

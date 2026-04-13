import { z } from 'zod';

export const DiscipleshipStatusesSchema = z.object({
  Status_ID: z.number().int(),
  Status: z.string().max(50),
});

export type DiscipleshipStatusesInput = z.infer<typeof DiscipleshipStatusesSchema>;

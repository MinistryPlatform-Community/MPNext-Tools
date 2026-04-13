import { z } from 'zod';

export const GroupHistorySchema = z.object({
  Group_History_ID: z.number().int(),
  Group_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Group_History_Type_ID: z.number().int(),
  Event_ID: z.number().int().nullable(),
  Communication_ID: z.number().int().nullable(),
  Notes: z.string().max(512).nullable(),
});

export type GroupHistoryInput = z.infer<typeof GroupHistorySchema>;

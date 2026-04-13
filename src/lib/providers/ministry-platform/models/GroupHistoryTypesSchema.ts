import { z } from 'zod';

export const GroupHistoryTypesSchema = z.object({
  Group_History_Type_ID: z.number().int(),
  Group_History_Type: z.string().max(50),
});

export type GroupHistoryTypesInput = z.infer<typeof GroupHistoryTypesSchema>;

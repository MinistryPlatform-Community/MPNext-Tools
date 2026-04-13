import { z } from 'zod';

export const ForumTopicsSchema = z.object({
  Forum_Topic_ID: z.number().int(),
  Title: z.string().max(250),
  Group_ID: z.number().int(),
  Created_By: z.number().int(),
  Start_Date: z.string().datetime(),
});

export type ForumTopicsInput = z.infer<typeof ForumTopicsSchema>;

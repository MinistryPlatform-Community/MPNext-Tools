import { z } from 'zod';

export const TextboardMessagesSchema = z.object({
  TextBoard_Message_ID: z.number().int(),
  TextBoard_Message: z.string().max(2147483647),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
});

export type TextboardMessagesInput = z.infer<typeof TextboardMessagesSchema>;

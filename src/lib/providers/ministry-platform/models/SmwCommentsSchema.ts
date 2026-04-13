import { z } from 'zod';

export const SmwCommentsSchema = z.object({
  SMW_Comment_ID: z.number().int(),
  SMW_Day_ID: z.number().int(),
  User_ID: z.number().int(),
  Comment: z.string().max(1000),
  Start_Date: z.string().datetime(),
  Web_Approved: z.boolean(),
});

export type SmwCommentsInput = z.infer<typeof SmwCommentsSchema>;

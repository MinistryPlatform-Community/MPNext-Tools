import { z } from 'zod';

export const SermonEncoderLogSchema = z.object({
  Sermon_Encoder_Log_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Message: z.string().max(256),
  User_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
});

export type SermonEncoderLogInput = z.infer<typeof SermonEncoderLogSchema>;

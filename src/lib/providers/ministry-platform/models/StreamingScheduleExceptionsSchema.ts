import { z } from 'zod';

export const StreamingScheduleExceptionsSchema = z.object({
  Streaming_Schedule_Exception_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime(),
  Show_Streaming: z.boolean(),
  Streaming_Config_ID: z.number().int(),
});

export type StreamingScheduleExceptionsInput = z.infer<typeof StreamingScheduleExceptionsSchema>;

import { z } from 'zod';

export const StreamingSchedulesSchema = z.object({
  Streaming_Schedule_ID: z.number().int(),
  Day_Of_Week: z.number().int(),
  Start_Time: z.string(),
  End_Time: z.string(),
  Enabled: z.boolean(),
  Streaming_URL: z.string().max(255).nullable(),
  Dash_Streaming_URL: z.string().max(255).nullable(),
  RESI_Embed_ID: z.string().max(64).nullable(),
  Congregation_ID: z.number().int(),
  Streaming_Config_ID: z.number().int(),
});

export type StreamingSchedulesInput = z.infer<typeof StreamingSchedulesSchema>;

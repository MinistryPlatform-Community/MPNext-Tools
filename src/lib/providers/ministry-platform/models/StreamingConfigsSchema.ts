import { z } from 'zod';

export const StreamingConfigsSchema = z.object({
  Streaming_Config_ID: z.number().int(),
  Name: z.string().max(50),
  Description: z.string().max(512).nullable(),
  Congregation_ID: z.number().int(),
  HLS_Url: z.string().max(255),
  DASH_Url: z.string().max(255).nullable(),
  RESI_Embed_ID: z.string().max(50),
});

export type StreamingConfigsInput = z.infer<typeof StreamingConfigsSchema>;

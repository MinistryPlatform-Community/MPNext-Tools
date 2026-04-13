import { z } from 'zod';

export const PocketPlatformSermonTranscriptionsSchema = z.object({
  Pocket_Platform_Sermon_Transcription_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Title: z.string().max(256).nullable(),
  Description: z.string().max(2147483647).nullable(),
  Language: z.string().max(50),
  Start_Date: z.string().datetime(),
  Transcription: z.string().max(2147483647).nullable(),
  SRT_Data: z.string().max(2147483647).nullable(),
  Weekly_Challenge: z.string().max(2000).nullable(),
  Group_Questions: z.string().max(4000).nullable(),
});

export type PocketPlatformSermonTranscriptionsInput = z.infer<typeof PocketPlatformSermonTranscriptionsSchema>;

import { z } from 'zod';

export const WorshipSongsSchema = z.object({
  Worship_Song_ID: z.number().int(),
  Title: z.string().max(256),
  Artist: z.string().max(128).nullable(),
  Congregation_ID: z.number().int(),
  HLS_Video: z.string().max(384).nullable(),
  Start_Date: z.string().datetime(),
  New_Until: z.string().datetime().nullable(),
  Sort_Order: z.number().int().nullable(),
  Active: z.boolean(),
});

export type WorshipSongsInput = z.infer<typeof WorshipSongsSchema>;

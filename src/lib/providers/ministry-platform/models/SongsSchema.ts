import { z } from 'zod';

export const SongsSchema = z.object({
  Song_ID: z.number().int(),
  Song_Title: z.string().max(128),
  Artist: z.string().max(128),
  Album: z.string().max(128).nullable(),
  Lyrics: z.string().max(2147483647).nullable(),
  ITunes: z.string().max(256).nullable(),
  Spotify: z.string().max(256).nullable(),
});

export type SongsInput = z.infer<typeof SongsSchema>;

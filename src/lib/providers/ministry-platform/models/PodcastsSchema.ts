import { z } from 'zod';

export const PodcastsSchema = z.object({
  PodCast_ID: z.number().int(),
  Title: z.string().max(128),
  Description: z.string().max(384),
  Podcast_URL: z.string().max(128),
  Items_To_Include: z.number().int(),
  Author_Name: z.string().max(50),
  Author_Email: z.string().email().max(254),
  Podcast_GUID: z.string().uuid(),
  Update_Image: z.boolean(),
});

export type PodcastsInput = z.infer<typeof PodcastsSchema>;

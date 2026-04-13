import { z } from 'zod';

export const PocketPlatformSermonTagsSchema = z.object({
  Sermon_Tag_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Tag_ID: z.number().int(),
});

export type PocketPlatformSermonTagsInput = z.infer<typeof PocketPlatformSermonTagsSchema>;

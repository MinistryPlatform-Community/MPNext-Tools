import { z } from 'zod';

export const SermonTagsSchema = z.object({
  Sermon_Tag_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Tag_ID: z.number().int(),
  Start_Date: z.string().datetime(),
});

export type SermonTagsInput = z.infer<typeof SermonTagsSchema>;

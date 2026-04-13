import { z } from 'zod';

export const GroupTagsSchema = z.object({
  Group_Tag_ID: z.number().int(),
  Tag_ID: z.number().int(),
  Group_ID: z.number().int(),
});

export type GroupTagsInput = z.infer<typeof GroupTagsSchema>;

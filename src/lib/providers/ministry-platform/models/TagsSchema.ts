import { z } from 'zod';

export const TagsSchema = z.object({
  Tag_ID: z.number().int(),
  Tag: z.string().max(50),
  Tag_Group: z.string().max(50).nullable(),
});

export type TagsInput = z.infer<typeof TagsSchema>;

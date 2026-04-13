import { z } from 'zod';

export const BlogTagsSchema = z.object({
  Blog_Tag_ID: z.number().int(),
  Blog_ID: z.number().int(),
  Tag_ID: z.number().int(),
  Start_Date: z.string().datetime(),
});

export type BlogTagsInput = z.infer<typeof BlogTagsSchema>;

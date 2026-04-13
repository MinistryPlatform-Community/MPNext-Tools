import { z } from 'zod';

export const ForumPostsSchema = z.object({
  Forum_Post_ID: z.number().int(),
  Forum_Topic_ID: z.number().int(),
  Parent_Post_ID: z.number().int().nullable(),
  User_ID: z.number().int(),
  Post: z.string().max(2000),
  Start_Date: z.string().datetime(),
  Last_Update: z.string().datetime(),
  Pin_Order: z.number().int().nullable(),
});

export type ForumPostsInput = z.infer<typeof ForumPostsSchema>;

import { z } from 'zod';

export const BlogSchema = z.object({
  Blog_ID: z.number().int(),
  Title: z.string().max(150),
  Summary: z.string().max(255).nullable(),
  Post: z.string().max(2147483647),
  Start_Date: z.string().datetime(),
  Author: z.number().int(),
  Approved: z.boolean(),
  Featured: z.boolean(),
});

export type BlogInput = z.infer<typeof BlogSchema>;

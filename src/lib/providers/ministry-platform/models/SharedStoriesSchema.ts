import { z } from 'zod';

export const SharedStoriesSchema = z.object({
  Church_Story_ID: z.number().int(),
  First_Name: z.string().max(50),
  Last_Name: z.string().max(50),
  Email_Address: z.string().email().max(254),
  Contact_ID: z.number().int().nullable(),
  Anonymous: z.boolean().nullable(),
  Story: z.string().max(2147483647),
  Video_Url: z.string().max(255).nullable(),
  Start_Date: z.string().datetime(),
});

export type SharedStoriesInput = z.infer<typeof SharedStoriesSchema>;

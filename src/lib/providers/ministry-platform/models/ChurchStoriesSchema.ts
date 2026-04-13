import { z } from 'zod';

export const ChurchStoriesSchema = z.object({
  Church_Story_ID: z.number().int(),
  First_Name: z.string().max(50),
  Last_Name: z.string().max(50),
  Email_Address: z.string().email().max(254),
  Contact_ID: z.number().int().nullable(),
  Anonymous: z.boolean(),
  Story: z.string().max(2147483647).nullable(),
  Video_Url: z.string().max(255).nullable(),
  Start_Date: z.string().datetime(),
});

export type ChurchStoriesInput = z.infer<typeof ChurchStoriesSchema>;

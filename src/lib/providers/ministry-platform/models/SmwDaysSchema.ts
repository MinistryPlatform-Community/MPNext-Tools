import { z } from 'zod';

export const SmwDaysSchema = z.object({
  SMW_Day_ID: z.number().int(),
  Title: z.string().max(50),
  Day: z.number().int(),
  Video_File: z.string().max(256).nullable(),
  Social_Image_File: z.string().max(256).nullable(),
  Video_Image_File: z.string().max(256).nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Milestone_ID: z.number().int(),
  Scripture_Reference: z.string().max(128).nullable(),
  Scripture: z.string().max(512).nullable(),
  HTML_Content: z.string().max(2147483647).nullable(),
  Additional_Video_File: z.string().max(256).nullable(),
  Id: z.string().uuid(),
  Watched: z.number().int(),
});

export type SmwDaysInput = z.infer<typeof SmwDaysSchema>;

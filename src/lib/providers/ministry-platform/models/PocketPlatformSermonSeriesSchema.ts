import { z } from 'zod';

export const PocketPlatformSermonSeriesSchema = z.object({
  Sermon_Series_ID: z.number().int(),
  Title: z.string().max(100),
  Description: z.string().max(2147483647).nullable(),
  Display_Title: z.string().max(100).nullable(),
  Subtitle: z.string().max(100).nullable(),
  Status_ID: z.number().int(),
  Position: z.number().int().nullable(),
  Congregation_ID: z.number().int().nullable(),
  Series_Start_Date: z.string().datetime().nullable(),
  Old_Series: z.number().int().nullable(),
  Sermon_Series_Type_ID: z.number().int(),
  Bible_Book_ID: z.number().int().nullable(),
  Show_On_Roku: z.boolean().nullable(),
  Series_UUID: z.string().uuid().nullable(),
  Last_Message_Date: z.string().datetime().nullable(),
  Sermon_Series_Roku_Category_ID: z.number().int().nullable(),
  Podcast: z.number().int(),
  Book_ID: z.number().int().nullable(),
  Latest_Sermon_Date: z.string().datetime().nullable(),
});

export type PocketPlatformSermonSeriesInput = z.infer<typeof PocketPlatformSermonSeriesSchema>;

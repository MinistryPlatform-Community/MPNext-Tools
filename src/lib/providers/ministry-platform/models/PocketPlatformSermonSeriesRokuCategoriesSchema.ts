import { z } from 'zod';

export const PocketPlatformSermonSeriesRokuCategoriesSchema = z.object({
  Sermon_Series_Roku_Category_ID: z.number().int(),
  Sermon_Series_Roku_Category_Name: z.string().max(75),
  Sermon_Series_Roku_Category_Description: z.string().max(4000).nullable(),
});

export type PocketPlatformSermonSeriesRokuCategoriesInput = z.infer<typeof PocketPlatformSermonSeriesRokuCategoriesSchema>;

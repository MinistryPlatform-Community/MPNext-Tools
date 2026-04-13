import { z } from 'zod';

export const PocketPlatformSermonSeriesTypesSchema = z.object({
  Sermon_Series_Type_ID: z.number().int(),
  Sermon_Series_Type: z.string().max(50),
  Congregation_ID: z.number().int().nullable(),
  Enabled: z.boolean(),
});

export type PocketPlatformSermonSeriesTypesInput = z.infer<typeof PocketPlatformSermonSeriesTypesSchema>;

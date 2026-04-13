import { z } from 'zod';

export const PocketPlatformSermonLinkTypesSchema = z.object({
  Sermon_Link_Type_ID: z.number().int(),
  Sermon_Link_Type: z.string().max(50),
  Icon_ID: z.number().int(),
  Media_Type_ID: z.number().int().nullable(),
});

export type PocketPlatformSermonLinkTypesInput = z.infer<typeof PocketPlatformSermonLinkTypesSchema>;

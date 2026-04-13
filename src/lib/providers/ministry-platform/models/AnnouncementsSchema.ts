import { z } from 'zod';

export const AnnouncementsSchema = z.object({
  Announcement_ID: z.number().int(),
  Title: z.string().max(128),
  Congregation_ID: z.number().int(),
  Rank: z.number().int().nullable(),
  Announcement: z.string().max(2147483647),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime(),
  Contact_ID: z.number().int().nullable(),
  Campus_Highlight: z.boolean(),
  Church_Highlight: z.boolean(),
  Event_ID: z.number().int().nullable(),
  Group_ID: z.number().int().nullable(),
  Ministry_ID: z.number().int().nullable(),
  Url_Link: z.string().max(256).nullable(),
  Web_Approved: z.boolean().nullable(),
});

export type AnnouncementsInput = z.infer<typeof AnnouncementsSchema>;

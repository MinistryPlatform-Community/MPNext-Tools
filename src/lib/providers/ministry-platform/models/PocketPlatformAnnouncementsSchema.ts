import { z } from 'zod';

export const PocketPlatformAnnouncementsSchema = z.object({
  Announcement_ID: z.number().int(),
  Announcement_Type_ID: z.number().int(),
  Announcement_Title: z.string().max(100),
  Body: z.string().max(2147483647).nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Enabled: z.boolean(),
  Link_URL: z.string().max(255).nullable(),
  Position: z.number().int().nullable(),
  Dismissible: z.boolean().nullable(),
  Congregation_ID: z.number().int().nullable(),
  Audience_ID: z.number().int().nullable(),
  Show_Image_Only: z.boolean(),
});

export type PocketPlatformAnnouncementsInput = z.infer<typeof PocketPlatformAnnouncementsSchema>;

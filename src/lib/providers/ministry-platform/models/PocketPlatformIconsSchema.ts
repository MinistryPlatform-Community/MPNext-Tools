import { z } from 'zod';

export const PocketPlatformIconsSchema = z.object({
  Icon_ID: z.number().int(),
  Icon_Name: z.string().max(50),
  Icon_Code: z.string().max(50).nullable(),
  Font_Family: z.string().max(100),
});

export type PocketPlatformIconsInput = z.infer<typeof PocketPlatformIconsSchema>;

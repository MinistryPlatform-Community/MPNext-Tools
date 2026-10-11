import { z } from 'zod';

export const PocketPlatformSocialMediaProvidersSchema = z.object({
  Social_Media_Provider_ID: z.number().int(),
  Social_Media_Provider: z.string().max(100),
});

export type PocketPlatformSocialMediaProvidersInput = z.infer<typeof PocketPlatformSocialMediaProvidersSchema>;

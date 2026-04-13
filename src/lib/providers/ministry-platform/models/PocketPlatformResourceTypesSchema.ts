import { z } from 'zod';

export const PocketPlatformResourceTypesSchema = z.object({
  Resource_Type_ID: z.number().int(),
  Resource_Type: z.string().max(50),
});

export type PocketPlatformResourceTypesInput = z.infer<typeof PocketPlatformResourceTypesSchema>;

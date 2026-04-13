import { z } from 'zod';

export const PocketPlatformActionTypesSchema = z.object({
  Action_Type_ID: z.number().int(),
  Action_Type: z.string().max(50),
});

export type PocketPlatformActionTypesInput = z.infer<typeof PocketPlatformActionTypesSchema>;

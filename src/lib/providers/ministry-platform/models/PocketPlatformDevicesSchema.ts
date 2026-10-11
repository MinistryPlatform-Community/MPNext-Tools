import { z } from 'zod';

export const PocketPlatformDevicesSchema = z.object({
  Device_ID: z.number().int(),
  Hardware_ID: z.string().max(50),
  User_ID: z.number().int().nullable(),
  First_Seen: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Last_Seen: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Platform: z.string().max(50).nullable(),
  App_ID: z.number().int().nullable(),
});

export type PocketPlatformDevicesInput = z.infer<typeof PocketPlatformDevicesSchema>;

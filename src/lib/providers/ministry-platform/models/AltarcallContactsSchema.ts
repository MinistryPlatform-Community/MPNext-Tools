import { z } from 'zod';

export const AltarcallContactsSchema = z.object({
  AltarCall_Contact_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Override_Phone: z.string().max(50).nullable(),
  Enabled: z.boolean(),
});

export type AltarcallContactsInput = z.infer<typeof AltarcallContactsSchema>;

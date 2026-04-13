import { z } from 'zod';

export const AltarcallExemptionsSchema = z.object({
  AltarCall_Exemption_ID: z.number().int(),
  AltarCall_Contact_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime(),
});

export type AltarcallExemptionsInput = z.infer<typeof AltarcallExemptionsSchema>;

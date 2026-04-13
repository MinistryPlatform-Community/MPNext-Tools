import { z } from 'zod';

export const FlsaStatusesSchema = z.object({
  FLSA_Status_ID: z.number().int(),
  FLSA_Status: z.string().max(128),
});

export type FlsaStatusesInput = z.infer<typeof FlsaStatusesSchema>;

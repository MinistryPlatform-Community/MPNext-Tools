import { z } from 'zod';

export const RedFlagStatusesSchema = z.object({
  Red_Flag_Status_ID: z.number().int(),
  Status: z.string().max(50),
});

export type RedFlagStatusesInput = z.infer<typeof RedFlagStatusesSchema>;

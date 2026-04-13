import { z } from 'zod';

export const SmsCommunicationStatusesSchema = z.object({
  SMS_Communication_Status_ID: z.number().int(),
  Status: z.string().max(50),
});

export type SmsCommunicationStatusesInput = z.infer<typeof SmsCommunicationStatusesSchema>;

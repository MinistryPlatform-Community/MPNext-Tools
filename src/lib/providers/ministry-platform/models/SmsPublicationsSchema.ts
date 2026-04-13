import { z } from 'zod';

export const SmsPublicationsSchema = z.object({
  SMS_Publication_ID: z.number().int(),
  Publication_Name: z.string().max(50),
  Twilio_Number: z.string().max(50).nullable(),
  SMS_Configuration_ID: z.number().int().nullable(),
});

export type SmsPublicationsInput = z.infer<typeof SmsPublicationsSchema>;

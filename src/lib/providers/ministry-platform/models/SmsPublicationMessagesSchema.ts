import { z } from 'zod';

export const SmsPublicationMessagesSchema = z.object({
  SMS_Publication_Message_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Message: z.string().max(512),
  SMS_Publication_ID: z.number().int(),
});

export type SmsPublicationMessagesInput = z.infer<typeof SmsPublicationMessagesSchema>;

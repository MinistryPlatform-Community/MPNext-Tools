import { z } from 'zod';

export const SmsConfigurationsSchema = z.object({
  SMS_Configuration_ID: z.number().int(),
  Name: z.string().max(50),
  Twilio_Phone: z.string().max(12),
  Messaging_Service_Sid: z.string().max(128).nullable(),
  Account_SID: z.string().max(128),
  Auth_Token: z.unknown(),
});

export type SmsConfigurationsInput = z.infer<typeof SmsConfigurationsSchema>;
